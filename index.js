const micro = require('micro')
const {get, post, router} = require('microrouter')

const mongo = require('./lib/utils/mongo')
const {checkQueue} = require('./lib/utils/queues')

const {upsertLink, getLinkSummary} = require('./lib/link')

const server = micro(
  router(

    get('/:link', async req => {
      const summary = await getLinkSummary(req.params.link)

      if (!summary) {
        throw micro.createError(404, `link with id ${req.params.link} was not found`)
      }

      return summary
    }),

    post('/', async req => {
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
