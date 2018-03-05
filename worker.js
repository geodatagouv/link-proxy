const mongo = require('./lib/utils/mongo')

async function main() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost'
  const mongoDb = process.env.MONGO_DB || 'link-proxy'

  await mongo.connect(mongoUrl, mongoDb)

  // eslint-disable-next-line import/no-unassigned-import
  require('./jobs/check')
}

main()
