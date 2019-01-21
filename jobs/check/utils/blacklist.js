const {parse} = require('url') // eslint-disable-line node/no-deprecated-api
const {isMatch} = require('matcher')

const store = require('../../../lib/utils/store')

const blacklisted = [
  store.client.endpoint.host,

  'data.gouv.fr',
  '*.data.gouv.fr',

  '*.openstreetmap.fr'
]

function isBlacklisted(location) {
  const {host} = parse(location)

  return blacklisted.some(
    pattern => isMatch(host, pattern, {
      caseSensitive: false
    })
  )
}

module.exports = {isBlacklisted}
