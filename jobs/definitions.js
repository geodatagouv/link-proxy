const ms = require('ms')

module.exports = [
  {
    name: 'check',
    concurrency: 2,
    options: {
      jobIdKey: 'linkId',
      timeout: ms('30m')
    }
  },

  {
    name: 'webhook',
    concurrency: 10,
    options: {
      jobIdKey: 'checkId',
      timeout: ms('10s'),
      removeOnFail: true
    }
  }
]
