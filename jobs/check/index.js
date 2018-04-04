const {cpus} = require('os')
const Bluebird = require('bluebird')
const {analyzeLocation} = require('plunger')
const bytes = require('bytes')
const debug = require('debug')('link-proxy:check')
const del = require('del')

const pkg = require('../../package.json')
const mongo = require('../../lib/utils/mongo')
const queues = require('../../lib/utils/queues')

const {createCheck} = require('./check')
const {updateLink} = require('./link')
const {getUrlCache, setUrlCache, getFileCache} = require('./cache')
const {flatten} = require('./flatten')
const {upload} = require('./upload')

const concurrency = cpus().length

function triggerWebhook(link, check, location, state) {
  queues.hooksQueue.add({
    linkId: link._id,
    check: check.number,
    name: location,
    state
  }, {
    jobId: `${link._id}-${check.number}-${state}`,
    removeOnComplete: true,
    timeout: 1000 * 10
  })
}

async function analyze(linkId, location, options) {
  options = {
    noCache: false,
    ...options
  }

  const link = await mongo.db.collection('links').findOne({
    _id: new mongo.ObjectID(linkId)
  })

  const check = await createCheck(link, location, options)

  debug(`Running check #${check.number} for link "${check.location}".`)
  triggerWebhook(link, check, location, check.state)

  if (check.state !== 'started') {
    debug(`Check #${check.number} for link "${check.location}" was ${check.state}.`)
    return
  }

  const tree = await analyzeLocation(location, {
    userAgent: `link-proxy/${pkg.version} (+https://geo.data.gouv.fr/doc/link-proxy)`,
    maxDownloadSize: bytes('1GB'),
    concurrency,
    cache: {
      getFileCache: getFileCache(options.noCache),
      getUrlCache: getUrlCache(options.noCache),
      setUrlCache: setUrlCache(options.noCache)
    }
  })

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'analyzing',
      updatedAt: new Date(),
      statusCode: tree.statusCode
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
      const mainFile = bundle.files[0]

      const download = {
        linkId: link._id,
        checkId: check._id,
        createdAt: new Date(),
        type: bundle.type,
        archive: bundle.files.length > 1,
        name: mainFile.fileName,
        files: bundle.files.map(f => ({
          name: f.fileName,
          size: f.fileSize,
          digest: f.digest
        }))
      }

      let previous
      if (bundle.changed !== bundle.files.length) {
        previous = await mongo.db.collection('downloads').findOne({
          linkId: link._id,
          type: bundle.type,
          name: mainFile.fileName
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
      const {Location, ETag} = await upload(bundle, download, previous)

      await mongo.db.collection('downloads').updateOne({_id: download._id}, {
        $set: {
          url: Location,
          etag: ETag
        }
      })

      changes.bundles.add.push(download._id)
    }, {concurrency})

    return updateLink(link, changes)
  }, {concurrency})

  await del(result.temporaries, {
    force: true
  })

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'finished',
      updatedAt: new Date()
    }
  })

  triggerWebhook(link, check, location, 'finished')

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
}

module.exports = analyze
