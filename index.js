const micro = require('micro')
const {get, post, router} = require('microrouter')

const mongo = require('./lib/utils/mongo')
const {checkQueue} = require('./lib/utils/queues')

const {findLink, upsertLink, getLinkSummary} = require('./lib/link')
const {getLinkChecks} = require('./lib/check')

const server = micro(
  router(

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

      checkQueue.add({
        name: json.location,
        linkId: link._id
      }, {
        jobId: link._id,
        removeOnComplete: true,
        removeOnFail: true,
        timeout: 1000 * 60 * 30
      })

      return link
    })
  )

)

async function main() {
  const port = process.env.PORT || 5000

  await mongo.connect()
  await server.listen(port)

  console.log(`Server running on port ${port}`)
}

main()
