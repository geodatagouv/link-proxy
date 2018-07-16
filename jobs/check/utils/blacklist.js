const {parse} = require('url')

const store = require('../../../lib/utils/store')

function isBlacklisted(location) {
  const {host} = parse(location)

  const blacklisted = [
    store.client.endpoint.host,

    'cadastre.data.gouv.fr'

    // TODO: add config/database stored list of domains to blacklist as well.
  ]

  return blacklisted.includes(host)
}

module.exports = {isBlacklisted}
