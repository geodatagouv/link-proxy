const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const {upsertLink} = require('../../lib/link')
const check = require('../../jobs/check')

const NAME = 'test-link-proxy-errored'

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
  it('should do something own links', async () => {
    const URL = `http://${NAME}-throw-http`

    nock(URL).get('/error').reply(500, () => null)

    const url = `${URL}/error`
    const {_id} = await upsertLink(url)

    await expect(check(_id, url)).rejects.toThrow('Received invalid status code: 500')
  })
})
