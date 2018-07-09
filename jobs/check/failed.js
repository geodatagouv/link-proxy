const debug = require('debug')('link-proxy:jobs:check')

const mongo = require('../../lib/utils/mongo')
const {onError} = require('../../lib/utils/queues')

const {PlungerError} = require('./errors')

async function onCheckFailed(job, err) {
  const check = await mongo.db.collection('checks').findOne({
    linkId: new mongo.ObjectID(job.data.linkId)
  }, {
    projection: {
      _id: 1,
      number: 1,
      options: 1
    },
    sort: {
      number: -1
    }
  })

  if (check) {
    await mongo.db.collection('checks').updateOne({_id: check._id}, {
      $set: {
        state: 'errored',
        error: err.message
      }
    })

    debug(`Check #${check.number} for link "${job.data.location}" was errored.`)
  }

  if (!(err instanceof PlungerError)) {
    onError(job, err)
  }
}

module.exports = onCheckFailed
