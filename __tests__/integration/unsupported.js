const mongo = require('../../lib/utils/mongo')
const {upsertLink} = require('../../lib/link')
const {getLinkChecks} = require('../../lib/check')
const check = require('../../jobs/check')

const NAME = 'test-link-proxy-unsupported'

beforeAll(async () => {
  process.env.MONGO_DB = NAME

  await mongo.connect()
  await mongo.ensureIndexes()
})

afterAll(async () => {
  await mongo.db.dropDatabase()
  await mongo.disconnect(true)
})

describe(NAME, () => {
  it('should blacklist own links', async () => {
    const URL = 'http://something/foo.7z.001'

    const {_id} = await upsertLink(URL)
    await check.handler({
      data: {
        linkId: _id,
        location: URL
      }
    })

    const [lastCheck] = await getLinkChecks(_id)
    expect(lastCheck.state).toBe('unsupported')
  })
})
