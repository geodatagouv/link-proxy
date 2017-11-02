const {analyzeLocation, extractFiles} = require('plunger')
const debug = require('debug')('link-proxy:check')

const mongo = require('../lib/mongo')

async function getUrlCache(token) {
  const link = await mongo.db.collection('links').findOne({
    locations: token.url
  })

  return link && {
    etag: link.etag
  }
}

async function setUrlCache(token) {
  const now = new Date()

  mongo.db.collection('links').findOneAndUpdate({
    locations: {
      $elemMatch: {
        $eq: token.url
      }
    }
  }, {
    $setOnInsert: {
      createdAt: now
    },
    $set: {
      updatedAt: now,
      etag: token.etag
    },
    $addToSet: {
      locations: {
        $each: [token.url, token.finalUrl, ...token.redirectUrls]
      }
    }
  }, {
    upsert: true,
    returnOriginal: false
  })
}

async function handler({data: {location, number}}) {
  debug(`Running check #${number} for link "${location}".`)

  const tree = await analyzeLocation(location, {
    cache: {
      getUrlCache,
      setUrlCache
    }
  })

  const res = extractFiles(tree, {
    keepUnknownTypes: false
  })

  debug(`Found ${res.files.length} new files.`)

  debug(`Check #${number} for link "${location}" ended successfully.`)
}

module.exports = {handler}
