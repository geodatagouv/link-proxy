const {createReadStream} = require('fs')
const {parse} = require('url')
const formatDate = require('date-fns/format')
const {ZipFile} = require('yazl')
const got = require('got')
const unzip = require('unzip-stream')

const store = require('../../lib/utils/store')

function formatName(file, ext) {
  let name = file.filePath || file.fileName

  if (ext) {
    const fileType = file.fileTypes.find(ft => ft.source === 'path:filename')

    if (fileType) {
      name = `${name.slice(0, -fileType.ext.length - 1)}.${ext}`
    }
  }

  return name
}

async function uploadSingle(bundle, distribution) {
  const file = bundle.files[0]

  const {hostname} = parse(file.url || file.fromUrl)

  const resourceName = [
    hostname,
    formatDate(distribution.createdAt, 'YYYY-MM-DD'),
    distribution._id,
    formatName(file)
  ].join('/')

  return store.upload(resourceName, createReadStream(file.path))
}

async function uploadBundle(bundle, distribution, previous) {
  const first = bundle.files[0]
  const {hostname} = parse(first.url || first.fromUrl)
  const changed = []
  const unchanged = []

  bundle.files.forEach(f => {
    (f.unchanged ? unchanged : changed).push(f)
  })

  const zip = new ZipFile()

  if (previous) {
    const names = unchanged.map(f => f.fileName)

    await new Promise((resolve, reject) => {
      got.stream(previous.url)
        .pipe(new unzip.Parse())
        .on('entry', entry => {
          if (names.includes(entry.path)) {
            zip.addReadStream(entry, entry.path)
          } else {
            entry.autodrain()
          }
        })
        .on('error', reject)
        .on('end', resolve)
    })
  }

  changed.forEach(related => {
    zip.addFile(related.path, related.fileName)
  })

  zip.end()

  const resourceName = [
    hostname,
    formatDate(distribution.createdAt, 'YYYY-MM-DD'),
    distribution._id,
    formatName(first, 'zip')
  ].join('/')

  return store.upload(resourceName, zip.outputStream)
}

function upload(bundle, distribution, previous) {
  if (bundle.files.length === 1) {
    return uploadSingle(bundle, distribution)
  }

  return uploadBundle(bundle, distribution, previous)
}

module.exports = {upload}
