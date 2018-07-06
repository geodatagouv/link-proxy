const {createCheck} = require('../../../jobs/check/check')
const mongo = require('../../../lib/utils/mongo')
const store = require('../../../lib/utils/store')

const NAME = 'test-link-proxy-unit-check-check'

describe('check.check', () => {
  beforeAll(async () => {
    process.env.MONGO_DB = NAME

    await mongo.connect()
    await mongo.ensureIndexes()
  })

  afterAll(async () => {
    await mongo.db.dropDatabase()
    await mongo.disconnect(true)
  })

  it('should create a check for a given location and link', async () => {
    const link = {_id: new mongo.ObjectID()}

    const check = await createCheck(link, 'http://example.org/1')

    expect(check).toMatchSnapshot({
      _id: expect.any(mongo.ObjectID),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      linkId: expect.any(mongo.ObjectID)
    })
  })

  it('should increase the number when running multiple checks on the same link', async () => {
    const link = {_id: new mongo.ObjectID()}

    await createCheck(link, 'http://example.org/2')
    const check = await createCheck(link, 'http://example.org/2')

    expect(check.number).toBe(2)
  })

  it('should increase the number even if the last check doesn’t have one', async () => {
    const link = {_id: new mongo.ObjectID()}

    await mongo.db.collection('checks').insertOne({
      linkId: link._id,
      location: 'http://example.org/3'
    })

    const check = await createCheck(link, 'http://example.org/3')

    expect(check.number).toBe(2)
  })

  it('should mark checks on blacklisted domains as blacklisted', async () => {
    const link = {_id: new mongo.ObjectID()}

    const check = await createCheck(link, store.client.endpoint.href)

    expect(check.state).toBe('blacklisted')
  })

  it('should not skip the check if Cache-Control is available and there is no previous check', async () => {
    const link = {
      _id: new mongo.ObjectID(),
      cacheControl: 'max-age=1234567890'
    }

    const check = await createCheck(link, 'http://example.org/4', {})

    expect(check.state).toBe('started')
  })

  it('should skip the check if max-age hasn’t expired yet', async () => {
    const link = {
      _id: new mongo.ObjectID(),
      cacheControl: 'max-age=1234567890'
    }

    await mongo.db.collection('checks').insertOne({
      createdAt: new Date(),
      linkId: link._id,
      location: 'http://example.org/5'
    })

    const check = await createCheck(link, 'http://example.org/5', {})

    expect(check.state).toBe('skipped')
  })

  it('should ignore Cache-Control checks if noCache is enabled', async () => {
    const link = {
      _id: new mongo.ObjectID(),
      cacheControl: 'max-age=1234567890'
    }

    await mongo.db.collection('checks').insertOne({
      createdAt: new Date(),
      linkId: link._id,
      location: 'http://example.org/6'
    })

    const check = await createCheck(link, 'http://example.org/6', {
      noCache: true
    })

    expect(check.state).toBe('started')
  })

  it('should not skip the check if max-age has expired', async () => {
    const link = {
      _id: new mongo.ObjectID(),
      cacheControl: 'max-age=1'
    }

    await mongo.db.collection('checks').insertOne({
      createdAt: new Date(),
      linkId: link._id,
      location: 'http://example.org/7'
    })

    await new Promise(resolve => {
      setTimeout(() => resolve(), 2000)
    })

    const check = await createCheck(link, 'http://example.org/7', {})

    expect(check.state).toBe('started')
  })

  it('should skip immutable files', async () => {
    const link = {
      _id: new mongo.ObjectID(),
      cacheControl: 'immutable'
    }

    await mongo.db.collection('checks').insertOne({
      createdAt: new Date(),
      linkId: link._id,
      location: 'http://example.org/8'
    })

    await new Promise(resolve => {
      setTimeout(() => resolve(), 2000)
    })

    const check = await createCheck(link, 'http://example.org/8', {})

    expect(check.state).toBe('skipped')
  })
})
