const Redis = require('ioredis')

const sentry = require('./sentry')

function createRedis() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  })

  redis.on('error', err => {
    sentry.captureException(err)
  })

  return redis
}

module.exports = createRedis
