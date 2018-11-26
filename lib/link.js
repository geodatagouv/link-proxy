const mongo = require('./utils/mongo')

function findLink(url) {
  return mongo.db.collection('links').findOne({
    locations: url
  }, {
    projection: {
      _id: 1
    }
  })
}

async function upsertLink(location) {
  const now = new Date()

  const query = {
    locations: {
      $elemMatch: {
        $eq: location
      }
    }
  }

  const projection = {
    createdAt: 1,
    updatedAt: 1,
    locations: 1
  }

  try {
    const {value} = await mongo.db.collection('links').findOneAndUpdate(query, {
      $setOnInsert: {
        createdAt: now,
        updatedAt: now,
        downloads: []
      },
      $addToSet: {
        locations: location
      }
    }, {
      upsert: true,
      returnOriginal: false,
      projection
    })

    return value
  } catch (error) {
    if (error.codeName === 'DuplicateKey') {
      // Running multiple checks on the same link can lead to a DuplicateKey error
      // as it may have been created by another worker.
      // Find the matching link in that case.
      return mongo.db.collection('links').findOne(query, {
        projection
      })
    }

    throw error
  }
}

async function getAllLinks(linkId) {
  const [link] = await mongo.db.collection('links').aggregate([
    {
      $match: {
        _id: linkId
      }
    },
    {
      $graphLookup: {
        from: 'links',
        startWith: '$links',
        connectFromField: 'links',
        connectToField: '_id',
        as: 'subLinks'
      }
    },
    {
      $project: {
        createdAt: 1,
        updatedAt: 1,
        locations: 1,
        downloads: 1,

        'subLinks.createdAt': 1,
        'subLinks.updatedAt': 1,
        'subLinks.locations': 1,
        'subLinks.downloads': 1
      }
    }
  ]).toArray()

  return link
}

async function getLinkSummary(id) {
  const objectId = mongo.parseObjectID(id)
  if (!objectId) {
    return null
  }

  const main = await getAllLinks(objectId)

  if (!main) {
    return null
  }

  let downloadIds = main.downloads ? [...main.downloads] : []
  let {updatedAt} = main

  for (const link of main.subLinks) {
    if (link.downloads && link.downloads.length > 0) {
      downloadIds = downloadIds.concat(link.downloads)
    }

    if (updatedAt < link.updatedAt) {
      ({updatedAt} = link)
    }
  }

  const downloads = await mongo.db.collection('downloads').find({
    _id: {
      $in: downloadIds
    }
  }, {
    projection: {
      createdAt: 1,
      name: 1,
      path: 1,
      type: 1,
      archive: 1,
      files: 1,
      url: 1,
      etag: 1
    }
  }).toArray()

  const {_id, createdAt, locations} = main

  return {
    _id,
    createdAt,
    updatedAt,
    locations,
    downloads
  }
}

module.exports = {findLink, upsertLink, getLinkSummary}
