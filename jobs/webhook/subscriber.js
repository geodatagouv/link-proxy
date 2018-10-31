const mongo = require('../../lib/utils/mongo')

function getSubscribers() {
  // TODO: eventually allow filtering subscribers, by domains for example.
  const query = mongo.db.collection('subscribers').find({}, {
    projection: {
      name: 1,
      url: 1,
      token: 1
    }
  })

  return query.toArray()
}

module.exports = {getSubscribers}
