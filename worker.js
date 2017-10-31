const {join} = require('path')
const delayed = require('delayed-jobs')

const jobsPath = join(__dirname, 'jobs')

delayed.configure({
  kuePrefix: process.env.KUE_PREFIX || 'q',
  redisConfig: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  prefix: 'link-proxy',
  jobsPath,
  definitionsPath: `${jobsPath}/definitions.yml`
})

delayed.startProcessing()
