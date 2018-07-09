const mongo = require('../../lib/utils/mongo')

async function onCheckFailed(linkId, err) {
  const check = await mongo.db.collection('checks').findOne({
    linkId: new mongo.ObjectID(linkId)
  }, {
    projection: {
      _id: 1,
      options: 1
    },
    sort: {
      number: -1
    }
  })

  if (check) {
    await mongo.db.collection('checks').updateOne(check, {
      $set: {
        state: 'errored',
        error: err.message
      }
    })
  }
}

module.exports = onCheckFailed
