const cacheControl = require('@tusbar/cache-control')
const {subSeconds, subDays} = require('date-fns')

const {shouldSkip} = require('../../../../../jobs/check/utils/skip')

describe('jobs.check.utils.skip', () => {
  it('should skip check if Cache-Control is immutable', () => {
    const skip = shouldSkip({
      cacheControl: cacheControl.format({immutable: true})
    }, {})

    expect(skip).toBe(true)
  })

  it('should skip check if Cache-Control is not expired', () => {
    const skip = shouldSkip({
      cacheControl: cacheControl.format({maxAge: 1000})
    }, {
      createdAt: new Date()
    })

    expect(skip).toBe(true)
  })

  it('should not skip check if Cache-Control is expired', () => {
    const skip = shouldSkip({
      cacheControl: cacheControl.format({maxAge: 1000})
    }, {
      createdAt: subSeconds(new Date(), 1100)
    })

    expect(skip).toBe(false)
  })

  it('should skip check if last check is not older than 7 days', () => {
    const skip = shouldSkip({}, {
      createdAt: subDays(new Date(), 4)
    })

    expect(skip).toBe(true)
  })

  it('should not skip check if last check is older than 7 days', () => {
    const skip = shouldSkip({}, {
      createdAt: subDays(new Date(), 8)
    })

    expect(skip).toBe(false)
  })
})
