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
const {updateLink, getAllParentLinks} = require('./link')
const {getUrlCache, setUrlCache, getFileCache} = require('./cache')
const {flatten} = require('./flatten')
const {upload} = require('./upload')
const {PlungerError} = require('./errors')

const concurrency = cpus().length

function triggerWebhook(check, links) {
  queues.hooksQueue.add({
    name: check.location,
    checkId: check._id,
    links
  }, {
    jobId: check._id,
    removeOnComplete: true,
    removeOnFail: true,
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
    timeout: {
      connection: 6000,
      activity: 5000,
      download: 0
    },
    cache: {
      getFileCache: getFileCache(check.options.noCache),
      getUrlCache: getUrlCache(check.options.noCache),
      setUrlCache: setUrlCache(check.options.noCache)
    }
  })

  if (tree.error) {
    throw new PlungerError(tree.error)
  }

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
      locations: 1,
      downloads: 1
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

    const changedBundles = res.bundles.filter(bundle => bundle.changed > 0)

    await Bluebird.map(changedBundles, async bundle => {
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

      let lastDownloadable = null

      if (subLink.downloads && subLink.downloads.length > 0) {
        const previousDownloads = await mongo.db.collection('downloads').find({
          _id: {
            $in: subLink.downloads
          },
          type: bundle.type,
          name: mainFile.fileName
        }, {
          sort: {
            createdAt: -1
          },
          projection: {
            url: 1
          }
        }).toArray()

        lastDownloadable = previousDownloads.find(p => p.url)

        if (previousDownloads.length > 0) {
          changes.bundles.remove.push(
            ...previousDownloads.map(d => d._id)
          )

          download.changedFiles = bundle.files.filter(f => !f.unchanged).map(f => f.fileName)
          download.previous = previousDownloads[0]._id
        }
      }

      await mongo.db.collection('downloads').insertOne(download)
      const res = await upload(bundle, download, lastDownloadable)

      await mongo.db.collection('downloads').updateOne({_id: download._id}, {
        $set: {
          url: res.location,
          etag: res.etag
        }
      })

      if (changed === undefined) {
        changed = false
      }

      changes.bundles.add.push(download._id)
    }, {concurrency})

    return updateLink(subLink, changes)
  }, {concurrency})

  await del(result.temporaries, {
    force: true
  })

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'finished',
      updatedAt: new Date(),
      ignored: result.ignored.map(token => ({
        url: token.url || token.fromUrl,
        digest: token.digest,
        fileName: token.fileName,
        fileSize: token.fileSize,
        filePath: token.filePath,
        fileTypes: token.fileTypes
      }))
    }
  })

  if (changed !== undefined) {
    const allLinks = await getAllParentLinks(links.map(l => l._id))

    triggerWebhook(check, allLinks)
  }

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
}

module.exports = analyze
