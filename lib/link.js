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
    $inc: {
      lastCheckNumber: 1
    },
    $addToSet: {
      locations: location
    }
  }, {
    upsert: true,
    returnOriginal: false
  })

  const check = {
    linkId: value._id,
    number: value.lastCheckNumber,
    createdAt: now,
    state: 'pending',
    location
  }

  await mongo.db.collection('checks').insertOne(check)

  return check
}

module.exports = {checkLink}
