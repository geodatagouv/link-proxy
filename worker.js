const {configureQueues, createJobQueue, disconnectQueues} = require('bull-manager')

const sentry = require('./lib/utils/sentry')
const mongo = require('./lib/utils/mongo')
const createRedis = require('./lib/utils/redis')

const jobs = require('./jobs/definitions')

async function main() {
  await mongo.connect()
  await mongo.ensureIndexes()

  configureQueues({
    isSubscriber: true,
    createRedis: createRedis({
      onError: shutdown
    }),
    prefix: 'link-proxy',
    onError: (job, err) => sentry.captureException(err, {
      extra: {
        queue: job.queue.name,
        ...job.data
      }
    })
  })

  await Promise.all(
    jobs.map(job => {
      const {handler, onError} = require(`./jobs/${job.name}`)

      return createJobQueue(job.name, handler, {
        concurrency: job.concurrency,
        onError
      }, job.options)
    })
  )

  mongo.client.on('close', () => {
    shutdown(new Error('Mongo connection was closed'))
  })
}

main().catch(error => {
  shutdown(error)
})

async function shutdown(err) {
  await Promise.all([
    disconnectQueues(),
    mongo.disconnect()
  ])

  if (err) {
    sentry.captureException(err)
    process.exit(1)
  }
}
