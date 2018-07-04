const types = require('../../lib/types')
const mongo = require('../../lib/utils/mongo')

function getLink(url) {
  return mongo.db.collection('links').findOne({
    locations: url
  }, {
    projection: {
      etag: 1,
      lastModified: 1,
      cacheControl: 1,
      fileTypes: 1,
      supported: 1
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

      // Previously not supported type should now be analyzed.
      const supported = types.isSupported(link.fileTypes)
      if (supported && !link.supported) {
        return null
      }

      return {
        etag: link.etag,
        lastModified: link.lastModified
      }
    }

    const now = new Date()
    await mongo.db.collection('links').insert({
      createdAt: now,
      updatedAt: now,
      locations: [token.url]
    })

    return null
  }
}

function setUrlCache(noCache) {
  return async token => {
    const link = await getLink(token.url)
    const supported = types.isSupported(token.fileTypes)

    if (!noCache &&
        link &&
        link.lastModified === token.lastModified &&
        link.etag === token.etag &&
        link.supported === supported
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
        cacheControl: token.cacheControl,
        fileTypes: token.fileTypes,
        supported
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
      filePath: token.filePath
    }, {
      projection: {
        _id: 1,
        supported: 1
      }
    })

    const supported = types.isSupported(token.fileTypes)

    if (cache) {
      if (noCache) {
        return false
      }

      if (supported && !cache.supported) {
        await mongo.db.collection('files').updateOne({
          _id: cache._id
        }, {
          $set: {
            supported
          }
        })
        return false
      }

      return true
    }

    const now = new Date()

    const doc = {
      createdAt: now,
      linkId: link._id,
      digest: token.digest,
      fileName: token.fileName,
      fileSize: token.fileSize,
      filePath: token.filePath,
      supported
    }

    await mongo.db.collection('files').insert(doc)

    return false
  }
}

module.exports = {getUrlCache, setUrlCache, getFileCache}
