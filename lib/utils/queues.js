const Queue = require('bull')
const sentry = require('./sentry')
const createRedis = require('./redis')

const onError = (job, err) => sentry.captureException(err, {
  extra: {
    queue: job.queue.name,
    ...job.data
  }
})

const connections = {
  client: undefined,
  subscriber: undefined
}

async function init(isSubscriber) {
  if (connections.client) {
    throw new Error('Queues were already initialized.')
  }

  connections.client = createRedis()
  if (isSubscriber) {
    connections.subscriber = createRedis()
  }

  const opts = {
    createClient: type => {
      switch (type) {
        case 'client':
          return connections.client

        case 'subscriber':
          if (!isSubscriber) {
            throw new Error('Subscriber queue was needed in client mode.')
          }
          return connections.subscriber

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

async function disconnect() {
  const {checkQueue, hooksQueue} = exports

  await Promise.all([
    checkQueue.disconnect(),
    hooksQueue.disconnect()
  ])

  if (connections.client) {
    await connections.client.quit()
  }

  if (connections.subscriber) {
    await connections.subscriber.quit()
  }
}

exports.init = init
exports.disconnect = disconnect
