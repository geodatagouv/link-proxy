const {parse} = require('url')
const micro = require('micro')

const {checkQueue} = require('./lib/queues')

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

  checkQueue.add({
    location: json.location
  }, {
    jobId: json.location,
    removeOnComplete: true,
    removeOnFail: true,
    timeout: 1000
  })

  return {
    location: json.location
  }
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

server.listen(process.env.PORT || 5000)
