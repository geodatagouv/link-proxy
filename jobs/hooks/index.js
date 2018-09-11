const Bluebird = require('bluebird')
const debug = require('debug')('link-proxy:jobs:hooks')
const got = require('got')

const userAgent = require('../../lib/user-agent')

const sentry = require('../../lib/utils/sentry')
const mongo = require('../../lib/utils/mongo')

const {getSubscribers} = require('./subscriber')

async function send(checkId, links) {
  const check = await mongo.db.collection('checks').findOne({
    _id: new mongo.ObjectID(checkId)
  }, {
    projection: {
      _id: 0,
      linkId: 1,
      createdAt: 1,
      updatedAt: 1,
      number: 1,
      state: 1,
      location: 1,
      options: 1,
      statusCode: 1
    }
  })

  if (!check) {
    throw new Error(`Check with id ${checkId} was not found, aborting webhook`)
  }

  debug(`Running webhook for check ${check.number} of "${check.location}".`)

  const payload = {
    check,
    links
  }

  const subscribers = await getSubscribers()

  await Bluebird.map(subscribers, async subscriber => {
    const headers = {
      'content-type': 'application/json',
      'user-agent': userAgent
    }

    if (subscriber.token) {
      headers.authorization = `Basic ${subscriber.token}`
    }

    try {
      await got.post(subscriber.url, {
        body: JSON.stringify(payload),
        headers
      })

      debug(`Webhook for check ${check.number} of "${check.location}" was sent to subscriber ${subscriber.name}.`)
    } catch (error) {
      sentry.captureException(error)

      debug(`Webhook for check ${check.number} of "${check.location}" was not sent to subscriber ${subscriber.name}.`)
    }
  }, {concurrency: 5})

  debug(`Webhook for check ${check.number} of "${check.location}" ended successfully.`)
}

module.exports = send
