const raven = require('raven')

const dsn = process.env.SENTRY_DSN

if (dsn) {
  raven.config(dsn).install()
  module.exports = raven
} else {
  module.exports = {
    captureException(err) {
      console.error(err)
    }
  }
}
