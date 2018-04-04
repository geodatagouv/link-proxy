const Queue = require('bull')
const sentry = require('./sentry')
const createRedis = require('./redis')

const onError = (job, err) => sentry.captureException(err, {
  extra: {
    queue: job.queue.name,
    ...job.data
  }
})

let client

async function init(subscriber) {
  if (client) {
    throw new Error('Queues were already initialized.')
  }

  client = createRedis()

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
  checkQueue.on('failed', onError)

  const hooksQueue = new Queue('hooks', opts)
  hooksQueue.on('failed', onError)

  // Export all queues
  exports.checkQueue = checkQueue
  exports.hooksQueue = hooksQueue

  return Promise.all([
    checkQueue.isReady(),
    hooksQueue.isReady()
  ])
}

exports.init = init
