const mongo = require('./utils/mongo')

async function getLinkChecks(linkId) {
  const objectId = mongo.parseObjectID(linkId)
  if (!objectId) {
    return null
  }

  const link = await mongo.db.collection('links').findOne({
    _id: objectId
  }, {
    projection: {
      _id: 1
    }
  })

  if (!link) {
    return null
  }

  const checks = await mongo.db.collection('checks').find({
    linkId: link._id
  }, {
    projection: {
      _id: 0,
      number: 1,
      createdAt: 1,
      updatedAt: 1,
      state: 1,
      statusCode: 1
    },
    limit: 20,
    sort: [
      ['_id', 'desc']
    ]
  }).toArray()

  return checks
}

function getLinkCheck(linkId, checkNumber) {
  const objectId = mongo.parseObjectID(linkId)
  if (!objectId) {
    return null
  }

  let number
  try {
    number = parseInt(checkNumber, 10)
  } catch (error) {
    return null
  }

  return mongo.db.collection('checks').findOne({
    linkId: objectId,
    number
  }, {
    projection: {
      _id: 0,
      number: 1,
      createdAt: 1,
      updatedAt: 1,
      state: 1,
      location: 1,
      statusCode: 1,
      options: 1,
      error: 1
    }
  })
}

function findLastCheck(linkId) {
  const objectId = mongo.parseObjectID(linkId)
  if (!objectId) {
    return null
  }

  return mongo.db.collection('checks').findOne({
    linkId: objectId
  }, {
    projection: {
      _id: 0,
      number: 1
    },
    sort: {
      number: -1
    }
  })
}

module.exports = {getLinkChecks, getLinkCheck, findLastCheck}
