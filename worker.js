const delayed = require('delayed-jobs')

const configureWorkers = require('./lib/config/worker')
const mongo = require('./lib/mongo')

configureWorkers()

mongo.connect(process.env.MONGO_URL || 'mongodb://localhost/link-proxy').then(() => {
  delayed.startProcessing()
  delayed.getApp().listen(4000)
})
