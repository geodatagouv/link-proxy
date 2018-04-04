const debug = require('debug')('link-proxy:hooks')

async function send(linkId, check, location, state) {
  debug(`Running webhook "${state}" for check #${check} of link "${location}".`)

  debug(`Webhook "${state}" for check #${check} of link "${location}" ended successfully.`)
}

module.exports = send
