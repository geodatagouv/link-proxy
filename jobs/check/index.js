const {cpus} = require('os')
const Bluebird = require('bluebird')
const {analyzeLocation} = require('plunger')
const debug = require('debug')('link-proxy:check')
const bytes = require('bytes')

const pkg = require('../../package.json')
const mongo = require('../../lib/mongo')
const {checkQueue} = require('../../lib/queues')

const {checkLink} = require('./link')
const {getUrlCache, setUrlCache, getFileCache} = require('./cache')
const {flatten} = require('./flatten')
const {upload} = require('./upload')

const concurrency = cpus().length

checkQueue.process(async ({data: {location}}) => {
  const check = await checkLink(location)

  debug(`Running check #${check.number} for link "${check.location}".`)

  const tree = await analyzeLocation(check.location, {
    userAgent: `link-proxy/${pkg.version} (+https://geo.data.gouv.fr/doc/link-proxy)`,
    maxDownloadSize: bytes('1GB'),
    concurrency,
    cache: {
      getFileCache,
      getUrlCache,
      setUrlCache
    }
  })

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'analyzing',
      updatedAt: new Date()
    }
  })

  const result = flatten(tree)
  const now = new Date()

  const downloads = await Bluebird.map(result.bundles, async bundle => {
    const main = bundle.files[0]

    const link = await mongo.db.collection('links').findOne({
      locations: main.fromUrl || main.url
    }, {
      projection: {
        _id: 1
      }
    })

    const download = {
      linkId: link._id,
      createdAt: now,
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
      download.previousVersion = previous._id
    }

    await mongo.db.collection('downloads').insertOne(download)

    const {Location} = await upload(bundle, download, previous)

    await mongo.db.collection('downloads').updateOne({_id: download._id}, {
      $set: {
        url: Location
      }
    })

    return download
  }, {concurrency})

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'finished',
      updatedAt: new Date()
    },
    $addToSet: {
      downloads: {
        $each: downloads.map(d => d._id)
      }
    }
  })

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
})
