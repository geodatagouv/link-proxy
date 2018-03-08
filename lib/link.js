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
      locations: 1,
      createdAt: 1,
      updatedAt: 1
    }
  })

  return value
}

async function getAllLinks(linkId) {
  const link = await mongo.db.collection('links').findOne({
    _id: linkId
  }, {
    projection: {
      createdAt: 1,
      updatedAt: 1,
      locations: 1,
      downloads: 1,
      links: 1
    }
  })

  if (!link) {
    return []
  }

  if (link.links && link.links.length > 0) {
    const sublinks = await Promise.all(link.links.map(getAllLinks))

    return [link, ..._.flatten(sublinks)]
  }

  return [link]
}

async function getLinkSummary(id) {
  const links = await getAllLinks(new mongo.ObjectID(id))

  if (links.length === 0) {
    return null
  }

  let downloadIds = []
  let updatedAt = 0

  for (const link of links) {
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

  const [{_id, createdAt, locations}] = links

  return {
    _id,
    createdAt,
    updatedAt,
    locations,
    downloads
  }
}

module.exports = {upsertLink, getLinkSummary}
