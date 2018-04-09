const micro = require('micro')
const {get, post, router} = require('microrouter')

const sentry = require('./lib/utils/sentry')
const mongo = require('./lib/utils/mongo')
const queues = require('./lib/utils/queues')

const {findLink, upsertLink, getLinkSummary} = require('./lib/link')
const {getLinkChecks} = require('./lib/check')

function handleErrors(next) {
  return async (req, res) => {
    try {
      return await next(req, res)
    } catch (err) {
      if (err.statusCode) {
        if (err.originalError) {
          sentry.captureException(err)
        }

        return micro.send(res, err.statusCode, {
          error: err.message
        })
      }

      sentry.captureException(err)
      return micro.send(res, 500, {
        error: 'an unexpected error happened, we have been notified'
      })
    }
  }
}

const routes = router(
  get('/', async (req, res) => {
    if (!req.query.location) {
      throw micro.createError(400, 'location is required')
    }

    const link = await findLink(req.query.location)

    if (!link) {
      throw micro.createError(404, `link with location ${req.query.location} was not found`)
    }

    res.statusCode = 302
    res.setHeader('Location', `/${link._id}`)
    res.end()
  }),

  get('/:link', async req => {
    const summary = await getLinkSummary(req.params.link)

    if (!summary) {
      throw micro.createError(404, `link with id ${req.params.link} was not found`)
    }

    return summary
  }),

  get('/:link/checks', async req => {
    const checks = await getLinkChecks(req.params.link)

    if (!checks) {
      throw micro.createError(404, `link with id ${req.params.link} was not found`)
    }

    return checks
  }),

  post('/', async req => {
    const json = await micro.json(req)

    if (!json.location) {
      throw micro.createError(400, 'location is required')
    }

    const link = await upsertLink(json.location)

    queues.checkQueue.add({
      name: json.location,
      location: json.location,
      linkId: link._id,
      options: {
        noCache: Boolean(json.noCache)
      }
    }, {
      jobId: link._id,
      removeOnComplete: true,
      timeout: 1000 * 60 * 30
    })

    return link
  })
)

const server = micro(handleErrors(routes))

async function main() {
  const port = process.env.PORT || 5000

  await queues.init()
  await mongo.connect()
  await mongo.ensureIndexes()
  await server.listen(port)

  console.log(`Server running on port ${port}`)
}

main().catch(err => {
  sentry.captureException(err)

  server.close()
  queues.disconnect()
  mongo.disconnect()
})
