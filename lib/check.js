const mongo = require('./utils/mongo')

async function getLinkChecks(id) {
  const link = await mongo.db.collection('links').findOne({
    _id: new mongo.ObjectID(id)
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

module.exports = {getLinkChecks}
