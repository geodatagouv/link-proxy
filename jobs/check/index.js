const {cpus} = require('os')
const Bluebird = require('bluebird')
const {analyzeLocation} = require('plunger')
const bytes = require('bytes')
const debug = require('debug')('link-proxy:jobs:check')
const del = require('del')

const userAgent = require('../../lib/user-agent')

const mongo = require('../../lib/utils/mongo')
const queues = require('../../lib/utils/queues')

const {createCheck} = require('./check')
const {updateLink} = require('./link')
const {getUrlCache, setUrlCache, getFileCache} = require('./cache')
const {flatten} = require('./flatten')
const {upload} = require('./upload')

const concurrency = cpus().length

function triggerWebhook(link, action, source) {
  queues.hooksQueue.add({
    name: link.locations[0],
    linkId: link._id,
    source: {
      linkId: source.link._id,
      checkNumber: source.check.number,
      location: source.location
    },
    action
  }, {
    jobId: `${link._id}-${action}`,
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

  if (check.state !== 'started') {
    debug(`Check #${check.number} for link "${check.location}" was ${check.state}.`)
    return
  }

  const tree = await analyzeLocation(location, {
    userAgent,
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

  let changed
  await Bluebird.map(Object.entries(result.links), async ([url, res]) => {
    const subLink = linkMap[url]

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
        linkId: subLink._id,
        checkId: check._id,
        createdAt: new Date(),
        type: bundle.type,
        archive: bundle.files.length > 1,
        name: mainFile.fileName,
        path: mainFile.filePath || mainFile.fileName,
        files: bundle.files.map(f => ({
          name: f.fileName,
          size: f.fileSize,
          digest: f.digest
        }))
      }

      let previous
      if (bundle.changed !== bundle.files.length) {
        previous = await mongo.db.collection('downloads').findOne({
          linkId: subLink._id,
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

      if (previous) {
        changed = true
        triggerWebhook(subLink, 'updated', {link, check, location})
      } else {
        triggerWebhook(subLink, 'created', {link, check, location})
      }

      if (changed === undefined) {
        changed = false
      }

      changes.bundles.add.push(download._id)
    }, {concurrency})

    return updateLink(subLink, changes)
  }, {concurrency})

  if (changed !== undefined) {
    triggerWebhook(link, changed ? 'updated' : 'created', {link, check, location})
  }

  await del(result.temporaries, {
    force: true
  })

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'finished',
      updatedAt: new Date()
    }
  })

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
}

module.exports = analyze
