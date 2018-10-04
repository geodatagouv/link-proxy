const {getPossibleExtensions} = require('../../../../lib/utils/filename')

describe('check.utils.filename', () => {
  it('should return an empty array for extensionless filenames', () => {
    expect(
      getPossibleExtensions('foobar')
    ).toEqual([])
  })

  it('should return an empty array for filenames ending with dots', () => {
    expect(
      getPossibleExtensions('foobar.')
    ).toEqual([])

    expect(
      getPossibleExtensions('foobar....')
    ).toEqual([])
  })

  it('should return the extension for a simple filename', () => {
    expect(
      getPossibleExtensions('a-cool-csv.csv')
    ).toEqual([{
      name: 'a-cool-csv',
      ext: 'csv'
    }])

    expect(
      getPossibleExtensions('a.ext')
    ).toEqual([{
      name: 'a',
      ext: 'ext'
    }])

    expect(
      getPossibleExtensions('a.a')
    ).toEqual([{
      name: 'a',
      ext: 'a'
    }])
  })

  it('should not consider a hidden file as an extension', () => {
    expect(
      getPossibleExtensions('.foobar')
    ).toEqual([])
  })

  it('should return a hidden file’s extension', () => {
    expect(
      getPossibleExtensions('.foobar.txt')
    ).toEqual([{
      name: '.foobar',
      ext: 'txt'
    }])
  })

  it('should return multiple entries for potential composed extensions', () => {
    expect(
      getPossibleExtensions('a-complicated-extension.txt.gz')
    ).toEqual([{
      name: 'a-complicated-extension.txt',
      ext: 'gz'
    }, {
      name: 'a-complicated-extension',
      ext: 'txt.gz'
    }])

    expect(
      getPossibleExtensions('.hidden.SHP.xml')
    ).toEqual([{
      name: '.hidden.SHP',
      ext: 'xml'
    }, {
      name: '.hidden',
      ext: 'SHP.xml'
    }])
  })
})
