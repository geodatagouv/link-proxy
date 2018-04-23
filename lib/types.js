const {readFileSync} = require('fs')
const {join} = require('path')
const {flatMap} = require('lodash')
const {safeLoad} = require('js-yaml')

const types = safeLoad(
  readFileSync(
    join(__dirname, '../types.yml')
  )
)

const extensions = new Set(
  flatMap(types, ({extensions, related}) => ([
    ...extensions,
    ...(related || [])
  ]))
)

function isSupported(fileTypes = []) {
  return fileTypes.some(ft => ft.ext && extensions.has(ft.ext.toLowerCase()))
}

module.exports = types
module.exports.isSupported = isSupported
