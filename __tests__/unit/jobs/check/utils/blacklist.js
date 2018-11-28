const store = require('../../../../../lib/utils/store')
const {isBlacklisted} = require('../../../../../jobs/check/utils/blacklist')

describe('jobs.check.utils.blacklist', () => {
  it('should handle blacklisted domains', () => {
    const cases = [
      [store.client.endpoint.href, true],
      ['https://data.gouv.fr/foo', true],
      ['https://www.data.gouv.fr/file', true],
      ['http://static.data.gouv.fr/important/path', true],
      ['http://opendata.gouv.fr/important/path', false]
    ]

    for (const [input, result] of cases) {
      expect(
        isBlacklisted(input)
      ).toBe(result)
    }
  })
})
