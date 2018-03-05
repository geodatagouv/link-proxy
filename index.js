const {parse} = require('url')
const micro = require('micro')

const mongo = require('./lib/utils/mongo')
const {checkQueue} = require('./lib/utils/queues')

const {upsertLink} = require('./lib/link')

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

  const link = await upsertLink(json.location)

  checkQueue.add({
    name: json.location,
    link
  }, {
    jobId: link._id,
    removeOnComplete: true,
    removeOnFail: true,
    timeout: 1000 * 60 * 30
  })

  return link
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

async function main() {
  const port = process.env.PORT || 5000
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost'
  const mongoDb = process.env.MONGO_DB || 'link-proxy'

  await mongo.connect(mongoUrl, mongoDb)
  await server.listen(port)

  console.log(`Server running on port ${port}`)
}

main()
