const Queue = require('bull')
const sentry = require('./sentry')

const checkQueue = new Queue('check', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  prefix: 'link-proxy'
})

checkQueue.on('failed', (job, err) => {
  sentry.captureException(err)
})

module.exports = {checkQueue}
