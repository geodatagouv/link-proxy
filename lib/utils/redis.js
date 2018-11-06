const Redis = require('ioredis')

function createRedis(options) {
  return () => {
    options = options || {}

    const redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    })

    if (options.onError) {
      redis.on('error', error => {
        options.onError(error)
      })
    }

    if (options.onError) {
      redis.on('close', () => {
        options.onError(new Error('Redis connection was closed'))
      })
    }

    return redis
  }
}

module.exports = createRedis
