const mongo = require('../../lib/mongo')

async function getUrlCache(token) {
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
  }, {
    projection: {
      _id: 1
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
    return true
  }

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

module.exports = {getUrlCache, setUrlCache, getFileCache}
