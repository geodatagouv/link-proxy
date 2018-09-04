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
  it('should throw if the check returns a 500', async () => {
    const URL = `http://${NAME}-error-500`

    nock(URL).get('/500').reply(500, () => null)

    const url = `${URL}/500`
    const {_id} = await upsertLink(url)

    await expect(check(_id, url)).rejects.toThrow('Response code 500 (Internal Server Error)')
  })

  it('should fail for unsupported protocols', async () => {
    const url = `foo://${NAME}-error-protocol`
    const {_id} = await upsertLink(url)

    await expect(check(_id, url)).rejects.toThrow('Unsupported protocol "foo:"')
  })
})
