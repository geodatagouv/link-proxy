const {readFileSync} = require('fs')
const {join} = require('path')
const {safeLoad} = require('js-yaml')

const types = safeLoad(
  readFileSync(
    join(__dirname, '../types.yml')
  )
)

module.exports = types
