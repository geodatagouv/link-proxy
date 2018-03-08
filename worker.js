const mongo = require('./lib/utils/mongo')

async function main() {
  await mongo.connect()

  // eslint-disable-next-line import/no-unassigned-import
  require('./jobs/check')
}

main()
