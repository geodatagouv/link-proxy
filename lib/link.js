const mongo = require('./mongo')

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

  const count = await mongo.db.collection('checks').count({
    location: {
      $in: value.locations
    }
  })

  const {ops} = await mongo.db.collection('checks').insertOne({
    linkId: value._id,
    number: count + 1,
    createdAt: now,
    state: 'pending',
    location
  })

  console.log(ops[0])

  return ops[0]
}

module.exports = {checkLink}
