const {isUnsupported} = require('../../../../jobs/check/utils/unsupported')

describe('check.utils.unsupported', () => {
  it('should not support split 7z archives', () => {
    expect(
      isUnsupported('https://foo.com/hello.7z.001')
    ).toBe(true)

    expect(
      isUnsupported('https://foo.com/hello.7z.999')
    ).toBe(true)

    expect(
      isUnsupported('https://foo.com/hello.7z.001?query=bar')
    ).toBe(true)

    expect(
      isUnsupported('https://foo.com/hello.7z')
    ).toBe(false)
  })
})
