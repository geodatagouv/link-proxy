const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const store = require('../../lib/utils/store')
const {upsertLink, getLinkSummary} = require('../../lib/link')
const analyze = require('../../jobs/check/analyze')

const {shapefile} = require('../../__test-helpers__/archive')

const NAME = 'test-zip-shp'

beforeAll(async () => {
  process.env.S3_BUCKET = NAME

  await store.client.createBucket({Bucket: NAME}).promise()
  await mongo.connect('mongodb://localhost', NAME)
})

afterAll(async () => {
  const objects = await store.client.listObjects({Bucket: NAME}).promise()
  await store.client.deleteObjects({
    Bucket: NAME,
    Delete: {Objects: objects.Contents.map(({Key}) => ({Key}))}
  }).promise()

  await store.client.deleteBucket({Bucket: NAME}).promise()
  await mongo.db.dropDatabase()
  await mongo.disconnect(true)
})

describe(NAME, () => {
  it('should find a shapefile within the zip file', async () => {
    nock(`http://${NAME}`).get('/data.zip').reply(200, () => shapefile('data'), {
      'Transfer-Encoding': 'chunked'
    })

    const url = `http://${NAME}/data.zip`
    const {_id} = await upsertLink(url)
    await analyze(_id, url)

    const summary = await getLinkSummary(_id)
    expect(summary.downloads.map(({type, archive, files}) => ({
      type,
      archive,
      files
    }))).toMatchSnapshot()
  })
})
