const {readFileSync} = require('fs')
const {join} = require('path')
const {analyzeLocation} = require('plunger')
const debug = require('debug')('link-proxy:check')
const {safeLoad} = require('js-yaml')

const mongo = require('../lib/mongo')
const {checkLink} = require('../lib/link')

const chalk = require('chalk')

const fileTypes = safeLoad(readFileSync(join(__dirname, '../types.yml')))

async function getUrlCache(token) {
  return null

  const link = await mongo.db.collection('links').findOne({
    locations: token.url
  })

  if (link) {
    return {
      etag: link.etag,
      lastModified: link.lastModified
    }
  }

  const now = new Date()

  await mongo.db.collection('links').insert({
    createdAt: now,
    updatedAt: now,
    etag: token.etag,
    locations: [token.url]
  })

  return null
}

async function setUrlCache(token) {
  console.log(chalk.bold('[LINK-CACHE-MISS]'), chalk.yellow(token.url))

  const now = new Date()

  await mongo.db.collection('links').updateOne({
    locations: {
      $elemMatch: {
        $eq: token.url
      }
    }
  }, {
    $set: {
      updatedAt: now,
      etag: token.etag,
      lastModified: token.lastModified
    },
    $addToSet: {
      locations: {
        $each: [token.url, token.finalUrl, ...token.redirectUrls]
      }
    }
  })

  return true
}

async function getFileCache(token) {
  const link = await mongo.db.collection('links').findOne({
    locations: {
      $elemMatch: {
        $eq: token.url || token.fromUrl
      }
    }
  })

  const cache = await mongo.db.collection('files').findOne({
    linkId: link._id,
    digest: token.digest,
    filePath: token.filePath
  }, {
    projection: {
      _id: 1
    }
  })

  if (cache) {
    console.log(chalk.green('[FILE-CACHE-HIT!]'), chalk.grey(token.digest), chalk.cyan(token.filePath || token.fileName))
    return true
  }

  console.log(chalk.bold('[FILE-CACHE-MISS]'), chalk.grey(token.digest), chalk.cyan(token.filePath || token.fileName))

  const now = new Date()

  const doc = {
    createdAt: now,
    linkId: link._id,
    digest: token.digest,
    fileName: token.fileName,
    fileSize: token.fileSize,
    filePath: token.filePath
  }

  await mongo.db.collection('files').insert(doc)

  return false
}

async function handler({data: {location}}) {
  const check = await checkLink(location)

  debug(`Running check #${check.number} for link "${check.location}".`)

  await analyzeLocation(check.location, {
    cache: {
      getFileCache,
      getUrlCache,
      setUrlCache
    }
  })

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
}

module.exports = {handler}
