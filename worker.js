const sentry = require('./lib/utils/sentry')
const mongo = require('./lib/utils/mongo')
const createRedis = require('./lib/utils/redis')
const queues = require('./lib/utils/queues')

const check = require('./jobs/check')

async function main() {
  const subscriber = createRedis()

  await queues.init(subscriber)
  await mongo.connect()

  queues.checkQueue.process(({data: {
    linkId,
    name: location,
    options
  }}) => check(linkId, location, options))
}

main().catch(err => {
  sentry.captureException(err)
})
