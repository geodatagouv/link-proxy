const {analyzeLocation, extractFiles} = require('plunger')
const debug = require('debug')('link-proxy:check')

const mongo = require('../lib/mongo')
const {checkLink} = require('../lib/link')

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

  mongo.db.collection('links').updateOne({
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
    upsert: true
  })
}

async function handler({data: {location}}) {
  const check = await checkLink(location)

  debug(`Running check #${check.number} for link "${check.location}".`)

  const tree = await analyzeLocation(check.location, {
    cache: {
      getUrlCache,
      setUrlCache
    }
  })

  const res = extractFiles(tree, {
    keepUnknownTypes: false
  })

  debug(`Found ${res.files.length} new files.`)

  res.files.forEach(file => {
    console.log('####################################\n')
    console.log(file.fromUrl)
    console.log(file.fileName + ` (${file.type})`)
    console.log(`Related: ${(file.related || []).length}`)
  })

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
}

module.exports = {handler}
