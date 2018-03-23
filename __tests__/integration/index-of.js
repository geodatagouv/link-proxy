const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const {upsertLink, getLinkSummary} = require('../../lib/link')
const check = require('../../jobs/check')

const indexOf = require('../../__test-helpers__/index-of')
const {shapefile} = require('../../__test-helpers__/archive')

const NAME = 'test-link-proxy-index-of'

beforeAll(() => {
  process.env.MONGO_DB = NAME
  return mongo.connect()
})

afterAll(async () => {
  await mongo.db.dropDatabase()
  await mongo.disconnect(true)
})

describe(NAME, () => {
  it('should find a shapefile within the zip file of the index-of', async () => {
    const URL = `http://${NAME}-shp-zip-index-of`
    const iof = indexOf(['/house.zip', '/hotel.zip'])

    nock(URL)
      .get('/house.zip').reply(200, () => shapefile('house'), {
        'Transfer-Encoding': 'chunked'
      })
      .get('/hotel.zip').reply(200, () => shapefile('hotel'), {
        'Transfer-Encoding': 'chunked'
      })
      .get('/').reply(200, iof, {
        'Content-Type': 'text/html',
        'Content-Length': iof.length
      })

    const {_id} = await upsertLink(URL)
    await check(_id, URL)

    const summary = await getLinkSummary(_id)
    expect(summary.downloads.map(({type, archive, files}) => ({
      type,
      archive,
      files
    }))).toMatchSnapshot()
  })

  it('should find a shapefile within the zip file of the index-of of the index-of', async () => {
    const URL = `http://${NAME}-shp-zip-index-of-index-of`
    const iof1 = indexOf(['/sub/data1.zip', '/sub/data2.zip'])
    const iof2 = indexOf('/sub')

    nock(URL)
      .get('/sub/data1.zip').reply(200, () => shapefile('data1'), {
        'Transfer-Encoding': 'chunked'
      })
      .get('/sub/data2.zip').reply(200, () => shapefile('data2'), {
        'Transfer-Encoding': 'chunked'
      })
      .get('/sub').reply(200, iof1, {
        'Content-Type': 'text/html',
        'Content-Length': iof1.length
      })

    nock(URL).get('/').reply(200, iof2, {
      'Content-Type': 'text/html',
      'Content-Length': iof2.length
    })

    const {_id} = await upsertLink(URL)
    await check(_id, URL)

    const summary = await getLinkSummary(_id)
    expect(summary.downloads.map(({type, archive, files}) => ({
      type,
      archive,
      files
    }))).toMatchSnapshot()
  })

  it('should find a shapefile listed in the index-of', async () => {
    const URL = `http://${NAME}-shp-index-of`
    const files = ['/cool.shp', '/cool.shx', '/cool.dbf', '/cool.prj']

    for (const file of files) {
      nock(URL).get(file).reply(200, 'foo', {'Transfer-Encoding': 'chunked'})
    }

    const iof = indexOf(files)
    nock(URL).get('/').reply(200, iof, {
      'Content-Type': 'text/html',
      'Content-Length': iof.length
    })

    const {_id} = await upsertLink(URL)
    await check(_id, URL)

    const summary = await getLinkSummary(_id)
    expect(summary.downloads.map(({type, archive, files}) => ({
      type,
      archive,
      files
    }))).toMatchSnapshot()
  })
})
