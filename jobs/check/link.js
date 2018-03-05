const mongo = require('../../lib/utils/mongo')

async function updateLink(check, changes) {
  const remove = changes.filter(c => c.previousDownloadId)

  const bulk = mongo.db.collection('links').initializeOrderedBulkOp()

  bulk.find({_id: check.linkId}).updateOne({
    $pullAll: {
      downloads: remove.map(r => r.previousDownloadId)
    }
  })
  bulk.find({_id: check.linkId}).updateOne({
    $addToSet: {
      downloads: {
        $each: changes.map(c => c.downloadId)
      }
    }
  })

  return bulk.execute()
}

module.exports = {updateLink}
