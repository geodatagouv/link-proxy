const {differenceInSeconds, differenceInDays} = require('date-fns')
const cacheControl = require('@tusbar/cache-control')

function shouldSkip(link, lastCheck) {
  const now = new Date()

  if (link.cacheControl) {
    const cc = cacheControl.parse(link.cacheControl)
    if (cc.immutable || differenceInSeconds(now, lastCheck.createdAt) < cc.maxAge) {
      return true
    }
  } else if (differenceInDays(now, lastCheck.createdAt) < 7) {
    return true
  }

  return false
}

module.exports = {shouldSkip}
