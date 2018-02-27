const nock = require('nock')
const {ZipFile} = require('yazl')

const mongo = require('../../lib/mongo')
const analyze = require('../../jobs/check/analyze')

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
  await mongo.connect('mongodb://localhost', 'test-zip-shp')
  await mongo.db.dropDatabase()
})
afterAll(() => mongo.close())

describe('zip-shp', () => {
  it('should find a shapefile within the zip file', async () => {
    await analyze('http://test/data.zip')
  })
})
