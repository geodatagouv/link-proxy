const Queue = require('bull')

const checkQueue = new Queue('check', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  prefix: 'link-proxy'
})

checkQueue.on('failed', (job, err) => {
  console.log(err)
})

module.exports = {checkQueue}
