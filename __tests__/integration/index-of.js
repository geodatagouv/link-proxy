const nock = require('nock')

const mongo = require('../../lib/utils/mongo')
const store = require('../../lib/utils/store')
const {upsertLink} = require('../../lib/link')
const analyze = require('../../jobs/check/analyze')

const indexOf = require('../../__test-helpers__/index-of')
const {shapefile} = require('../../__test-helpers__/archive')

const NAME = 'test-index-of'

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
  it('should find a shapefile within the zip file of the index-of', async () => {
    nock(`http://${NAME}`).get('/data.zip').reply(200, () => shapefile('data'), {
      'Transfer-Encoding': 'chunked'
    })

    nock(`http://${NAME}`).get('/data2.zip').reply(200, () => shapefile('data2'), {
      'Transfer-Encoding': 'chunked'
    })

    const iof = indexOf(['/data.zip', '/data2.zip'])
    nock(`http://${NAME}`).get('/').reply(200, iof, {
      'Content-Type': 'text/html',
      'Content-Length': iof.length
    })

    const url = `http://${NAME}`
    const {_id} = await upsertLink(url)
    await analyze(_id, url)
  })

  it('should find a shapefile within the zip file of the index-of of the index-of', async () => {
    nock(`http://${NAME}`).get('/sub/data1.zip').reply(200, () => shapefile('data1'), {
      'Transfer-Encoding': 'chunked'
    })

    nock(`http://${NAME}`).get('/sub/data2.zip').reply(200, () => shapefile('data2'), {
      'Transfer-Encoding': 'chunked'
    })

    const iof1 = indexOf(['/sub/data1.zip', '/sub/data2.zip'])
    nock(`http://${NAME}`).get('/sub').reply(200, iof1, {
      'Content-Type': 'text/html',
      'Content-Length': iof1.length
    })

    const iof2 = indexOf('/sub')
    nock(`http://${NAME}`).get('/').reply(200, iof2, {
      'Content-Type': 'text/html',
      'Content-Length': iof2.length
    })

    const url = `http://${NAME}`
    const {_id} = await upsertLink(url)
    await analyze(_id, url)
  })

  it('should find a shapefile listed in the index-of', async () => {
    const files = ['/cool.shp', '/cool.shx', '/cool.dbf', '/cool.prj']
    for (const file of files) {
      nock(`http://${NAME}`).get(file).reply(200, 'foo', {'Transfer-Encoding': 'chunked'})
    }

    const iof = indexOf(files)
    nock(`http://${NAME}`).get('/').reply(200, iof, {
      'Content-Type': 'text/html',
      'Content-Length': iof.length
    })

    const url = `http://${NAME}`
    const {_id} = await upsertLink(url)
    await analyze(_id, url)
  })
})
