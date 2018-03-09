const _ = require('lodash')

const mongo = require('./utils/mongo')

async function upsertLink(location) {
  const now = new Date()

  const {value} = await mongo.db.collection('links').findOneAndUpdate({
    locations: {
      $elemMatch: {
        $eq: location
      }
    }
  }, {
    $setOnInsert: {
      createdAt: now,
      updatedAt: now
    },
    $addToSet: {
      locations: location
    }
  }, {
    upsert: true,
    returnOriginal: false,
    projection: {
      _id: 1
    }
  })

  return value
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
  const main = await getAllLinks(new mongo.ObjectID(id))

  if (!main) {
    return null
  }

  let downloadIds = [...main.downloads]
  let updatedAt = main.updatedAt

  for (const link of main.subLinks) {
    if (link.downloads.length > 0) {
      downloadIds = downloadIds.concat(link.downloads)
    }

    if (updatedAt < link.updatedAt) {
      updatedAt = link.updatedAt
    }
  }

  const downloads = await mongo.db.collection('downloads').find({
    _id: {
      $in: downloadIds
    }
  }, {
    projection: {
      _id: 0,
      createdAt: 1,
      name: 1,
      type: 1,
      archive: 1,
      files: 1,
      url: 1
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

module.exports = {upsertLink, getLinkSummary}
