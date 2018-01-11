const mongo = require('./lib/mongo')

mongo
  .connect(process.env.MONGO_URL || 'mongodb://localhost', process.env.MONGO_DB || 'link-proxy')
  .then(() => {
    // eslint-disable-next-line import/no-unassigned-import
    require('./jobs/check')
  })
