const mongo = require('../../lib/mongo')

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

module.exports = {checkLink}
