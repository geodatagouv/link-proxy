const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const {upsertLink, getLinkSummary} = require('../../lib/link')
const check = require('../../jobs/check')

const {shapefile} = require('../__helpers__/archive')
const {downloadsSnapshot} = require('../__helpers__/snapshots')

const NAME = 'test-link-proxy-zip-shp'

jest.mock('bull-manager', () => ({
  enqueue: jest.fn()
}))

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
  it('should find a shapefile within the zip file', async () => {
    const URL = `http://${NAME}-shp-zip`

    nock(URL)
      .get('/data.zip').reply(200, () => shapefile('data'), {
        'Transfer-Encoding': 'chunked'
      })

    const url = `${URL}/data.zip`
    const {_id} = await upsertLink(url)
    await check.handler({
      data: {
        linkId: _id,
        location: url
      }
    })

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

    await check.handler({
      data: {
        linkId: _id,
        location: url
      }
    })

    const firstSummary = await getLinkSummary(_id)
    expect(downloadsSnapshot(firstSummary.downloads)).toMatchSnapshot()

    nock(URL)
      .get('/data.zip')
      .reply(200, () => shapefile('data', 'foo'), {
        'Transfer-Encoding': 'chunked'
      })

    await check.handler({
      data: {
        linkId: _id,
        location: url,
        options: {
          noCache: true
        }
      }
    })

    const lastSummary = await getLinkSummary(_id)
    expect(downloadsSnapshot(lastSummary.downloads)).toMatchSnapshot()
  })
})
