const _ = require('lodash')
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

async function getAllParentLinks(linkIds) {
  const parents = await mongo.db.collection('links').aggregate([
    {
      $match: {
        _id: {
          $in: linkIds
        }
      }
    },
    {
      $graphLookup: {
        from: 'links',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'links',
        as: 'parents'
      }
    },
    {
      $project: {
        parents: {
          $map: {
            input: '$parents',
            as: 'parent',
            in: '$$parent._id'
          }
        }
      }
    }
  ]).toArray()

  return _(parents)
    .map(p => ([
      p._id,
      ...p.parents
    ]))
    .flatten()
    .uniqWith((a, b) => a && a.equals(b))
    .value()
}

module.exports = {updateLink, getAllParentLinks}
