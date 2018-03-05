const mongo = require('../../lib/utils/mongo')

async function checkLink(location) {
  const now = new Date()

  const {value} = await mongo.db.collection('links').findOneAndUpdate({
    locations: {
      $elemMatch: {
        $eq: location
      }
    }
  }, {
    $setOnInsert: {
      createdAt: now
    },
    $set: {
      updatedAt: now
    },
    $addToSet: {
      locations: location
    }
  }, {
    upsert: true,
    returnOriginal: false
  })

  const latest = await mongo.db.collection('checks').findOne({
    location: {
      $in: value.locations
    }
  }, {
    projection: {
      number: 1,
      _id: 0
    },
    sort: {
      number: -1
    }
  })

  const {ops} = await mongo.db.collection('checks').insertOne({
    linkId: value._id,
    number: latest ? (latest.number || 0) + 1 : 1,
    createdAt: now,
    updatedAt: now,
    state: 'started',
    location
  })

  return ops[0]
}

async function updateLink(check, changes) {
  const remove = changes.filter(c => c.previousDownloadId)

  const bulk = mongo.db.collection('links').initializeOrderedBulkOp()

  bulk.find({_id: check.linkId}).updateOne({
    $pullAll: {
      downloads: remove.map(r => r.previousDownloadId)
    }
  })
  bulk.find({_id: check.linkId}).updateOne({
    $addToSet: {
      downloads: {
        $each: changes.map(c => c.downloadId)
      }
    }
  })

  return bulk.execute()
}

module.exports = {checkLink, updateLink}
