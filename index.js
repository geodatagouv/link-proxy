const {parse} = require('url')
const micro = require('micro')
const {enqueue} = require('delayed-jobs')

const configureWorkers = require('./lib/config/worker')
const mongo = require('./lib/mongo')

const {checkLink} = require('./lib/link')

async function getHandler(req) {
  const {pathname, query} = parse(req.url, true)

  console.log(pathname, query)

  return 'ok'
}

async function postHandler(req) {
  const json = await micro.json(req)

  if (!json.location) {
    throw micro.createError(400, 'location is required')
  }

  const check = await checkLink(json.location)

  enqueue('check', {
    checkId: check._id,
    linkId: check.linkId,
    location: check.location,
    number: check.number
  })

  return check
}

const server = micro(async (req, res) => {
  try {
    switch (req.method) {
      case 'GET':
        return await getHandler(req)
      case 'POST':
        return await postHandler(req)

      default:
        return micro.send(res, 405, 'Invalid method')
    }
  } catch (err) {
    micro.sendError(req, res, err)
  }
})

configureWorkers()
mongo.connect(process.env.MONGO_URL || 'mongodb://localhost/link-proxy').then(() => {
  server.listen(process.env.PORT || 5000)
})
