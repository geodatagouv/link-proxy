const {cpus} = require('os')
const Bluebird = require('bluebird')
const {analyzeLocation} = require('plunger')
const bytes = require('bytes')
const debug = require('debug')('link-proxy:check')

const pkg = require('../../package.json')
const mongo = require('../../lib/utils/mongo')

const {createCheck} = require('./check')
const {updateLink} = require('./link')
const {getUrlCache, setUrlCache, getFileCache} = require('./cache')
const {flatten} = require('./flatten')
const {upload} = require('./upload')

const concurrency = cpus().length

async function analyze(link, location) {
  const check = await createCheck(link, location)

  debug(`Running check #${check.number} for link "${check.location}".`)

  const tree = await analyzeLocation(location, {
    userAgent: `link-proxy/${pkg.version} (+https://geo.data.gouv.fr/doc/link-proxy)`,
    maxDownloadSize: bytes('1GB'),
    concurrency,
    cache: {
      getFileCache,
      getUrlCache,
      setUrlCache
    }
  })

  const result = flatten(tree)

  const links = await mongo.db.collection('links')
    .find({
      locations: {
        $in: Object.keys(result.links)
      }
    })
    .project({
      _id: 1,
      locations: 1
    })
    .toArray()

  const linkMap = links.reduce((acc, link) => {
    for (const loc of link.locations) {
      acc[loc] = link
    }
    return acc
  }, {})

  await Bluebird.map(Object.entries(result.links), async ([url, res]) => {
    const link = linkMap[url]

    const changes = {
      links: {
        add: res.urls.map(u => linkMap[u]._id)
      },
      bundles: {
        remove: [],
        add: []
      }
    }

    await Bluebird.map(res.bundles, async bundle => {
      const download = {
        linkId: link._id,
        checkId: check._id,
        createdAt: new Date(),
        type: bundle.type,
        files: bundle.files.map(f => f.fileName)
      }

      let previous
      if (bundle.changed !== bundle.files.length) {
        previous = await mongo.db.collection('downloads').findOne({
          linkId: link._id,
          type: bundle.type,
          files: {
            $all: bundle.files.filter((f, idx) => idx === 0 || f.unchanged).map(f => f.fileName)
          }
        }, {
          sort: {
            createdAt: -1
          },
          projection: {
            url: 1
          }
        })
      }

      if (previous) {
        changes.bundles.remove.push(previous._id)

        download.previous = {
          _id: previous._id,
          changedFiles: bundle.files.filter(f => !f.unchanged).map(f => f.fileName)
        }
      }

      await mongo.db.collection('downloads').insertOne(download)
      const {Location} = await upload(bundle, download, previous)
      await mongo.db.collection('downloads').updateOne({_id: download._id}, {
        $set: {
          url: Location
        }
      })

      changes.bundles.add.push(download._id)
    }, {concurrency})

    return updateLink(link, changes)
  }, {concurrency})

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'finished',
      updatedAt: new Date()
    }
  })

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
}

module.exports = analyze
