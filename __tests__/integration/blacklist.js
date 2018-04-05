const mongo = require('../../lib/utils/mongo')
const store = require('../../lib/utils/store')
const {upsertLink} = require('../../lib/link')
const {getLinkChecks} = require('../../lib/check')
const check = require('../../jobs/check')

const NAME = 'test-link-proxy-blacklist'

beforeAll(() => {
  process.env.MONGO_DB = NAME
  return mongo.connect()
})

afterAll(async () => {
  await mongo.db.dropDatabase()
  await mongo.disconnect(true)
})

describe(NAME, () => {
  it('should blacklist own links', async () => {
    const URL = `${store.client.endpoint.href}/foo.zip`

    const {_id} = await upsertLink(URL)
    await check(_id, URL)

    const checks = await getLinkChecks(_id)
    expect(checks[0].state).toEqual('blacklisted')
  })
})
