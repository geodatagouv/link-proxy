const {flatten} = require('../../../jobs/check/flatten')

describe('check.flatten', () => {
  it('should return the file for a simple document', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'file',
      fileTypes: [{ext: 'txt'}]
    })

    expect(res).toMatchSnapshot()
  })

  it('should flatten a shapefile in an index-of', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'index-of',
      children: [
        {
          url: 'http://foo/1.shp',
          type: 'file',
          fileName: 'foo.shp',
          fileTypes: [{ext: 'shp'}]
        },
        {
          url: 'http://foo/1.shx',
          type: 'file',
          fileName: 'foo.shx',
          fileTypes: [{ext: 'shx'}]
        }
      ]
    })

    expect(res).toMatchSnapshot()
  })

  it('should return a sole shapefile in an index-of', () => {
    const res = flatten({
      url: 'http://foo',
      type: 'index-of',
      children: [
        {
          url: 'http://foo/1.shp',
          type: 'file',
          fileName: 'foo.shp',
          fileTypes: [{ext: 'shp'}]
        }
      ]
    })

    expect(res).toMatchSnapshot()
  })
})
