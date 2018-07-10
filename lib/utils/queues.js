const Queue = require('bull')
const sentry = require('./sentry')
const createRedis = require('./redis')

const onError = (job, err) => sentry.captureException(err, {
  extra: {
    queue: job.queue.name,
    ...job.data
  }
})

const connections = []

async function init(isSubscriber) {
  if (connections.client) {
    throw new Error('Queues were already initialized.')
  }

  const client = createRedis({
    onClose: disconnect
  })
  connections.push(client)

  let subscriber
  if (isSubscriber) {
    subscriber = createRedis({
      onClose: disconnect
    })
    connections.push(subscriber)
  }

  const opts = {
    createClient: type => {
      switch (type) {
        case 'client':
          return client

        case 'subscriber':
          if (!isSubscriber) {
            throw new Error('Subscriber queue was needed in client mode.')
          }
          return subscriber

        default: {
          const redis = createRedis({
            onClose: disconnect
          })
          connections.push(redis)
          return redis
        }
      }
    },
    prefix: 'link-proxy'
  }

  const checkQueue = new Queue('check', opts)
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

async function disconnect() {
  const {checkQueue, hooksQueue} = exports

  await Promise.all([
    checkQueue.disconnect(),
    hooksQueue.disconnect()
  ])

  await Promise.all(connections.map(connection => {
    return connection.disconnect()
  }))
}

exports.init = init
exports.disconnect = disconnect
exports.onError = onError
