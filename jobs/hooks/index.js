const Bluebird = require('bluebird')
const debug = require('debug')('link-proxy:hooks')
const got = require('got')

const userAgent = require('../../lib/user-agent')

const sentry = require('../../lib/utils/sentry')
const mongo = require('../../lib/utils/mongo')

const {getSubscribers} = require('./subscriber')

async function send(linkId, action, source) {
  debug(`Running webhook "${action}" for link "${linkId}", triggered by ${source.linkId}/${source.checkNumber}.`)

  const link = await mongo.db.collection('links').findOne({
    _id: new mongo.ObjectID(linkId)
  }, {
    projection: {
      locations: 1
    }
  })

  if (!link) {
    debug(`Webhook "${action}" for link "${linkId}", triggered by ${source.linkId}/${source.checkNumber}, failed.`)

    throw new Error(`Link ${linkId} was not found, did not trigger webhook`)
  }

  const payload = {
    link: linkId,
    locations: link.locations,
    action,
    subLink: source.linkId !== linkId,
    triggeredBy: {
      location: source.location,
      link: source.linkId,
      check: source.checkNumber
    }
  }

  const subscribers = await getSubscribers()

  await Bluebird.map(subscribers, async subscriber => {
    try {
      await got.post(subscriber.url, {
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
          'user-agent': userAgent
        }
      })

      debug(`Webhook "${action}" for link "${linkId}", was sent to subscriber ${subscriber.name}.`)
    } catch (err) {
      sentry.captureException(err)

      debug(`Webhook "${action}" for link "${linkId}", was not sent to subscriber ${subscriber.name}.`)
    }
  }, {concurrency: 5})

  debug(`Webhook "${action}" for link "${linkId}", triggered by ${source.linkId}/${source.checkNumber}, ended successfully.`)
}

module.exports = send
