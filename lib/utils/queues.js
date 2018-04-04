const Queue = require('bull')
const sentry = require('./sentry')
const createRedis = require('./redis')

const client = createRedis()

async function init(subscriber) {
  const opts = {
    createClient: type => {
      switch (type) {
        case 'client':
          return client

        case 'subscriber':
          if (!subscriber) {
            throw new Error('Subscriber queue was needed in client mode.')
          }
          return subscriber

        default:
          return createRedis()
      }
    },
    prefix: 'link-proxy'
  }

  const checkQueue = new Queue('check', opts)
  checkQueue.on('failed', (job, err) => {
    sentry.captureException(err, {
      extra: {
        queue: job.queue.name,
        ...job.data
      }
    })
  })

  const hooksQueue = new Queue('hooks', opts)
  hooksQueue.on('failed', (job, err) => {
    sentry.captureException(err, {
      extra: {
        queue: job.queue.name,
        ...job.data
      }
    })
  })

  // Export all queues
  exports.checkQueue = checkQueue
  exports.hooksQueue = hooksQueue

  return Promise.all([
    checkQueue.isReady(),
    hooksQueue.isReady()
  ])
}

exports.init = init
