const mongo = require('../../lib/utils/mongo')

const {isBlacklisted} = require('./utils/blacklist')
const {isUnsupported} = require('./utils/unsupported')
const {shouldSkip} = require('./utils/skip')

async function createCheck(link, location, options = {}) {
  const now = new Date()

  const [lastCheck, lastFinishedCheck] = await Promise.all([
    mongo.db.collection('checks').findOne({
      linkId: link._id
    }, {
      projection: {
        state: 1,
        number: 1
      },
      sort: {
        number: -1
      }
    }),

    mongo.db.collection('checks').findOne({
      linkId: link._id,
      state: 'finished'
    }, {
      projection: {
        createdAt: 1
      },
      sort: {
        number: -1
      }
    })
  ])

  if (lastCheck && lastCheck.state === 'errored') {
    options = {
      ...options,
      noCache: true
    }
  }

  const check = {
    linkId: link._id,
    number: lastCheck ? (lastCheck.number || 1) + 1 : 1,
    createdAt: now,
    updatedAt: now,
    state: 'started',
    location,
    options
  }

  if (isBlacklisted(location)) {
    check.state = 'blacklisted'
  } else if (isUnsupported(location)) {
    check.state = 'unsupported'
  } else if (lastFinishedCheck && !options.noCache && shouldSkip(link, lastFinishedCheck)) {
    check.state = 'skipped'
  }

  await mongo.db.collection('checks').insertOne(check)

  return check
}

module.exports = {createCheck}
