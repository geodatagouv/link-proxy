#!/usr/bin/env node

const mongo = require('../lib/utils/mongo')

if (process.env.NODE_ENV === 'production') {
  throw new Error('Do not run the seeding script in production')
}

(async () => {
  await mongo.connect()
  await mongo.ensureIndexes()

  try {
    // Insert webhook subscriber
    await mongo.db.collection('subscribers').insertOne({
      name: 'geoplatform',
      url: 'http://localhost:5001/hooks/link-proxy',
      token: 'blablabla'
    })

    console.log('[+] Successfully seeded the database')
  } catch (error) {
    console.error('[-] Failed seeding the database')
    console.error(error)
  } finally {
    await mongo.disconnect()
  }
})()
