const Redis = require('ioredis')

const sentry = require('./sentry')

function createRedis(options) {
  options = options || {}

  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  })

  redis.on('error', err => {
    sentry.captureException(err)
  })

  if (options.onClose) {
    redis.on('close', () => {
      options.onClose()
    })
  }

  return redis
}

module.exports = createRedis
