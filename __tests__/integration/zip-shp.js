const nock = require('nock')
const {ZipFile} = require('yazl')

const mongo = require('../../lib/mongo')
const store = require('../../lib/store')
const analyze = require('../../jobs/check/analyze')

const NAME = 'test-zip-shp'

nock('http://test')
  .get('/data.zip')
  .reply(200, () => {
    const zip = new ZipFile()

    zip.addBuffer(Buffer.from('shp content'), 'data.shp')
    zip.addBuffer(Buffer.from('shx content'), 'data.shx')
    zip.addBuffer(Buffer.from('dbf content'), 'data.dbf')
    zip.addBuffer(Buffer.from('prj content'), 'data.prj')

    zip.end()

    return zip.outputStream
  }, {
    'Transfer-Encoding': 'chunked'
  })

beforeAll(async () => {
  process.env.S3_BUCKET = NAME

  await store.client.createBucket({Bucket: NAME}).promise()
  await mongo.connect('mongodb://localhost', NAME)
  await mongo.db.dropDatabase()
})

afterAll(async () => {
  const objects = await store.client.listObjects({Bucket: NAME}).promise()
  await store.client.deleteObjects({
    Bucket: NAME,
    Delete: {Objects: objects.Contents.map(({Key}) => ({Key}))}
  }).promise()

  await store.client.deleteBucket({Bucket: NAME}).promise()
  await mongo.close()
})

describe('zip-shp', () => {
  it('should find a shapefile within the zip file', async () => {
    await analyze('http://test/data.zip')
  })
})
