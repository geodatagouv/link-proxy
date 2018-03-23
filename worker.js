const sentry = require('./lib/utils/sentry')
const mongo = require('./lib/utils/mongo')
const {checkQueue} = require('./lib/utils/queues')

const check = require('./jobs/check')

async function main() {
  await checkQueue.isReady()
  await mongo.connect()

  checkQueue.process(({data: {linkId, name: location}}) => check(linkId, location))
}

main().catch(err => {
  sentry.captureException(err)
})
