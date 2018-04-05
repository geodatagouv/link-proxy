const sentry = require('./lib/utils/sentry')
const mongo = require('./lib/utils/mongo')
const createRedis = require('./lib/utils/redis')
const queues = require('./lib/utils/queues')

const doCheck = require('./jobs/check')
const doHook = require('./jobs/hooks')

async function main() {
  const subscriber = createRedis()

  await queues.init(subscriber)
  await mongo.connect()

  queues.checkQueue.process(({data: {
    linkId,
    name: location,
    options
  }}) => doCheck(linkId, location, options))

  queues.hooksQueue.process(({data: {
    linkId,
    action,
    source
  }}) => doHook(linkId, action, source))
}

main().catch(err => {
  sentry.captureException(err)
})
