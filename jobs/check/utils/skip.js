const {differenceInSeconds, differenceInDays} = require('date-fns')
const cacheControl = require('@tusbar/cache-control')

function shouldSkip(link, lastCheck) {
  const now = new Date()

  if (link.cacheControl) {
    const cc = cacheControl.parse(link.cacheControl)
    if (cc.immutable) {
      return true
    }

    if (cc.maxAge) {
      return differenceInSeconds(now, lastCheck.createdAt) < cc.maxAge
    }

    // If the Cache-Control header does not include `immutable` or `max-age`,
    // fall back to the 7 days cache.
  }

  return differenceInDays(now, lastCheck.createdAt) < 7
}

module.exports = {shouldSkip}
