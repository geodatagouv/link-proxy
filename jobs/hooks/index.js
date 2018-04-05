const debug = require('debug')('link-proxy:hooks')

const mongo = require('../../lib/utils/mongo')

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
    _id: linkId,
    locations: link.locations,
    action,
    subLink: source.linkId !== linkId,
    triggeredBy: {
      location: source.location,
      link: source.linkId,
      check: source.checkNumber
    }
  }

  console.log(payload)

  debug(`Webhook "${action}" for link "${linkId}", triggered by ${source.linkId}/${source.checkNumber}, ended successfully.`)
}

module.exports = send
