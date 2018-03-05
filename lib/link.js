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
    returnOriginal: false,
    projection: {
      locations: 1,
      createdAt: 1,
      updatedAt: 1
    }
  })

  return value
}

module.exports = {upsertLink}
