const {createReadStream} = require('fs')
const {parse} = require('url')
const formatDate = require('date-fns/format')
const slug = require('slug')
const {ZipFile} = require('yazl')

const store = require('../../lib/store')

function formatName(node, ext) {
  let name = node.fileName

  if (node.filePath) {
    name = node.filePath.replace(/\//g, '-')
  }

  if (ext) {
    const fileType = node.fileTypes.find(ft => ft.source === 'path:filename')

    if (fileType) {
      name = `${name.slice(0, -fileType.ext.length)}${ext}`
    }
  }

  return slug(name, {
    mode: 'rfc3986'
  })
}

function uploadSingle(file, distribution) {
  const node = file.main
  const {hostname} = parse(node.url || node.fromUrl)

  const resourceName = [
    hostname,
    formatDate(distribution.createdAt, 'YYYY-MM-DD'),
    `${distribution._id}-${formatName(node)}`
  ].join('/')

  return store.upload(resourceName, createReadStream(node.path))
}

function uploadBundle(file, distribution) {
  const node = file.main
  const {hostname} = parse(node.url || node.fromUrl)

  const zip = new ZipFile()
  zip.addFile(node.path, node.fileName)
  file.related.forEach(related => {
    zip.addFile(related.path, related.fileName)
  })
  zip.end()

  const resourceName = [
    hostname,
    formatDate(distribution.createdAt, 'YYYY-MM-DD'),
    `${distribution._id}-${formatName(node, 'zip')}`
  ].join('/')

  return store.upload(resourceName, zip.outputStream)
}

function upload(file, distribution) {
  return file.related ? uploadBundle(file, distribution) : uploadSingle(file, distribution)
}

module.exports = {upload}
