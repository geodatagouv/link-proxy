const sentry = require('./lib/utils/sentry')
const mongo = require('./lib/utils/mongo')
const queues = require('./lib/utils/queues')

const doCheck = require('./jobs/check')
const onCheckFailed = require('./jobs/check/failed')
const doHook = require('./jobs/hooks')

async function main() {
  await queues.init(true)
  await mongo.connect()
  await mongo.ensureIndexes()

  mongo.client.on('close', () => {
    shutdown(new Error('Mongo connection was closed'))
  })

  queues.checkQueue.process(({data: {linkId, location, options}}) => doCheck(linkId, location, options))
  queues.checkQueue.on('failed', (job, err) => onCheckFailed(job, err))

  queues.hooksQueue.process(({data: {linkId, action, source}}) => doHook(linkId, action, source))
}

main().catch(err => {
  shutdown(err)
})

async function shutdown(err) {
  await Promise.all([
    queues.disconnect(),
    mongo.disconnect()
  ])

  if (err) {
    sentry.captureException(err)
    process.exit(1)
  }
}
