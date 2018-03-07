const mongo = require('../../lib/utils/mongo')

async function updateLink(link, changes) {
  const bulk = mongo.db.collection('links').initializeOrderedBulkOp()

  bulk.find({_id: link._id}).updateOne({
    $pullAll: {
      downloads: changes.bundles.remove
    }
  })
  bulk.find({_id: link._id}).updateOne({
    $addToSet: {
      links: {
        $each: changes.links.add
      },
      downloads: {
        $each: changes.bundles.add
      }
    }
  })

  return bulk.execute()
}

module.exports = {updateLink}
