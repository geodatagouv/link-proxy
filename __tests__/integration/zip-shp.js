const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const {upsertLink, getLinkSummary} = require('../../lib/link')
const check = require('../../jobs/check')

const {shapefile} = require('../../__test-helpers__/archive')

const NAME = 'test-link-proxy-zip-shp'

beforeAll(() => {
  process.env.MONGO_DB = NAME
  return mongo.connect()
})

afterAll(async () => {
  await mongo.db.dropDatabase()
  await mongo.disconnect(true)
})

describe(NAME, () => {
  it('should find a shapefile within the zip file', async () => {
    const URL = `http://${NAME}-shp-zip`

    nock(URL)
      .get('/data.zip').reply(200, () => shapefile('data'), {
        'Transfer-Encoding': 'chunked'
      })

    const url = `${URL}/data.zip`
    const {_id} = await upsertLink(url)
    await check(_id, url)

    const summary = await getLinkSummary(_id)
    expect(summary.downloads.map(({type, archive, files}) => ({
      type,
      archive,
      files
    }))).toMatchSnapshot()
  })
})
