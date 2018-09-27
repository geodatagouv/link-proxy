const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const queues = require('../../lib/utils/queues')
const {upsertLink, getLinkSummary} = require('../../lib/link')
const check = require('../../jobs/check')

const {shapefile} = require('../__helpers__/archive')
const {downloadsSnapshot} = require('../__helpers__/snapshots')

const NAME = 'test-link-proxy-zip-shp'

beforeAll(async () => {
  process.env.MONGO_DB = NAME

  await mongo.connect()
  await mongo.ensureIndexes()
  await queues.init()
})

afterAll(async () => {
  await mongo.db.dropDatabase()
  await mongo.disconnect(true)
  await queues.disconnect()
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
    expect(downloadsSnapshot(summary.downloads)).toMatchSnapshot()
  })

  it('should override the downloads if data is different', async () => {
    const URL = `http://${NAME}-shp-zip-caching`

    const url = `${URL}/data.zip`
    const {_id} = await upsertLink(url)

    nock(URL)
      .get('/data.zip')
      .reply(200, () => shapefile('data'), {
        'Transfer-Encoding': 'chunked'
      })

    await check(_id, url)
    const firstSummary = await getLinkSummary(_id)
    expect(downloadsSnapshot(firstSummary.downloads)).toMatchSnapshot()

    nock(URL)
      .get('/data.zip')
      .reply(200, () => shapefile('data', 'foo'), {
        'Transfer-Encoding': 'chunked'
      })

    await check(_id, url)
    const lastSummary = await getLinkSummary(_id)
    expect(downloadsSnapshot(lastSummary.downloads)).toMatchSnapshot()
  })
})
