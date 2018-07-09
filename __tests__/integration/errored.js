const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const {upsertLink} = require('../../lib/link')
const {getLinkChecks} = require('../../lib/check')
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

    await expect(check(_id, url)).rejects.toThrow('Received invalid status code: 500')
  })

  it('should not throw if the check returns a 404', async () => {
    const URL = `http://${NAME}-error-404`

    nock(URL).get('/404').reply(404, () => null)

    const url = `${URL}/404`
    const {_id} = await upsertLink(url)

    await check(_id, url)

    const [lastCheck] = await getLinkChecks(_id)
    expect(lastCheck.state).toBe('finished')
    expect(lastCheck.statusCode).toBe(404)
  })
})
