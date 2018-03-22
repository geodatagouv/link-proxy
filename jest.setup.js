const store = require('./lib/utils/store')

const BUCKET = 'test-link-proxy-files'
const DB = 'test-link-proxy'

async function setup() {
  process.env.S3_BUCKET = BUCKET
  process.env.MONGO_DB = DB

  try {
    await store.client.createBucket({Bucket: BUCKET}).promise()
  } catch (err) {
    console.error(`\n\nThe bucket "${BUCKET}" already exists, we’re re-using it, tests may fail.\n`)
  }
}

module.exports = setup
