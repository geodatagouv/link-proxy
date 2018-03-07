const {promisify} = require('util')
const rimraf = require('rimraf')

module.exports = promisify(rimraf)
