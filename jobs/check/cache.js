const mongo = require('../../lib/utils/mongo')
const fileTypes = require('../../lib/types')

function getLink(url) {
  return mongo.db.collection('links').findOne({
    locations: url
  }, {
    projection: {
      etag: 1,
      lastModified: 1,
      cacheControl: 1
    }
  })
}

function getUrlCache(noCache) {
  return async token => {
    const link = await getLink(token.url)

    if (link) {
      if (noCache) {
        return null
      }

      return {
        etag: link.etag,
        lastModified: link.lastModified
      }
    }

    const now = new Date()

    await mongo.db.collection('links').insertOne({
      createdAt: now,
      updatedAt: now,
      etag: token.etag,
      lastModified: token.lastModified,
      cacheControl: token.cacheControl,
      locations: [token.url]
    })

    return null
  }
}

function setUrlCache(noCache) {
  return async token => {
    const link = await getLink(token.url)

    if (!noCache &&
        link &&
        link.lastModified === token.lastModified &&
        link.etag === token.etag
    ) {
      return false
    }

    await mongo.db.collection('links').updateOne({
      locations: {
        $elemMatch: {
          $eq: token.url
        }
      }
    }, {
      $set: {
        updatedAt: new Date(),
        etag: token.etag,
        lastModified: token.lastModified,
        cacheControl: token.cacheControl
      },
      $addToSet: {
        // In the future, it may be interesting to link token.finalUrl and ...token.redirectUrls here.
        // We’re disabling it for now as it could lead to duplicate entries in the DB.
        locations: token.url
      }
    })

    return true
  }
}

function getFileCache(noCache) {
  return async token => {
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
      filePath: token.filePath,
      typesVersion: fileTypes.version
    }, {
      projection: {
        _id: 1
      }
    })

    if (cache) {
      // Return true if caching is enabled, false if caching is disabled
      // noCache === true means that caching is disabled.
      return !noCache
    }

    const now = new Date()

    const doc = {
      createdAt: now,
      typesVersion: fileTypes.version,
      linkId: link._id,
      digest: token.digest,
      fileName: token.fileName,
      fileSize: token.fileSize,
      filePath: token.filePath
    }

    await mongo.db.collection('files').insertOne(doc)

    return false
  }
}

module.exports = {getUrlCache, setUrlCache, getFileCache}
