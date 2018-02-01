const {readFileSync} = require('fs')
const {cpus} = require('os')
const {join} = require('path')
const Bluebird = require('bluebird')
const {analyzeLocation} = require('plunger')
const debug = require('debug')('link-proxy:check')
const {safeLoad} = require('js-yaml')
const bytes = require('bytes')

const pkg = require('../../package.json')
const mongo = require('../../lib/mongo')
const {checkQueue} = require('../../lib/queues')

const {checkLink} = require('./link')
const {getUrlCache, setUrlCache, getFileCache} = require('./cache')
const {flatten} = require('./flatten')
const {upload} = require('./upload')

const concurrency = cpus().length
const fileTypes = safeLoad(readFileSync(join(__dirname, '../../types.yml')))

checkQueue.process(async ({data: {location}}) => {
  const check = await checkLink(location)

  debug(`Running check #${check.number} for link "${check.location}".`)

  const tree = await analyzeLocation(check.location, {
    userAgent: `link-proxy/${pkg.version} (+https://geo.data.gouv.fr/doc/link-proxy)`,
    maxDownloadSize: bytes('500MB'),
    concurrency,
    cache: {
      getFileCache,
      getUrlCache,
      setUrlCache
    }
  })

  await mongo.db.collection('links').updateOne({_id: check._id}, {
    $set: {
      state: 'analyzing',
      updatedAt: new Date()
    }
  })

  const result = flatten(tree, fileTypes)

  const now = new Date()

  await Bluebird.map(result.files, async file => {
    const doc = {
      createdAt: now,
      linkId: check.linkId,
      type: file.type,
      name: file.main.fileName
    }

    if (file.related) {
      doc.related = file.related.map(r => r.fileName)
    }

    const {ops} = await mongo.db.collection('downloads').insertOne(doc)
    const download = ops[0]

    const {Location} = await upload(file, download)

    await mongo.db.collection('downloads').updateOne({_id: download._id}, {
      $set: {
        url: Location
      }
    })
  }, {concurrency})

  await mongo.db.collection('checks').updateOne({_id: check._id}, {
    $set: {
      state: 'finished',
      updatedAt: new Date()
    }
  })

  debug(`Check #${check.number} for link "${check.location}" ended successfully.`)
})
