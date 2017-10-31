const delayed = require('delayed-jobs')

const configureWorkers = require('./lib/config/worker')

configureWorkers()

delayed.startProcessing()
delayed.getApp().listen(4000)
