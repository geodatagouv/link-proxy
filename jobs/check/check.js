const mongo = require('../../lib/utils/mongo')

async function createCheck(link, location) {
  const now = new Date()

  const lastCheck = await mongo.db.collection('checks').findOne({
    linkId: link._id
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
    linkId: link._id,
    number: lastCheck ? (lastCheck.number || 0) + 1 : 1,
    createdAt: now,
    updatedAt: now,
    state: 'started',
    location
  })

  return ops[0]
}

module.exports = {createCheck}
