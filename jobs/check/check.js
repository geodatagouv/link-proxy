const differenceInSeconds = require('date-fns/difference_in_seconds')
const cacheControl = require('@tusbar/cache-control')

const types = require('../../lib/types')
const mongo = require('../../lib/utils/mongo')

const {isBlacklisted} = require('./utils/blacklist')

async function createCheck(link, location, options) {
  const now = new Date()

  const lastCheck = await mongo.db.collection('checks').findOne({
    linkId: link._id
  }, {
    projection: {
      createdAt: 1,
      number: 1,
      _id: 0
    },
    sort: {
      number: -1
    }
  })

  const check = {
    linkId: link._id,
    number: lastCheck ? (lastCheck.number || 0) + 1 : 1,
    createdAt: now,
    updatedAt: now,
    state: 'started',
    location,
    options
  }

  if (isBlacklisted(location)) {
    check.state = 'blacklisted'
  } else if (link.cacheControl) {
    const supportChanged = !link.supported && types.isSupported(link.fileTypes)

    if (!supportChanged) {
      const cc = cacheControl.parse(link.cacheControl)

      if (differenceInSeconds(lastCheck.createdAt, now) < cc.maxAge) {
        check.state = 'skipped'
      }
    }
  }

  await mongo.db.collection('checks').insertOne(check)

  return check
}

module.exports = {createCheck}
