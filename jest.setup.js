const store = require('./lib/utils/store')

const BUCKET = 'test-link-proxy-files'
const DB = 'test-link-proxy'
const BUCKET_POLICY = `
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"AddPerm",
      "Effect":"Allow",
      "Principal": "*",
      "Action":["s3:GetObject"],
      "Resource":[
        "arn:aws:s3:::${BUCKET}/*"
      ]
    }
  ]
}
`

async function setup() {
  process.env.S3_BUCKET = BUCKET
  process.env.MONGO_DB = DB

  try {
    await store.client.createBucket({
      Bucket: BUCKET
    }).promise()

    await store.client.putBucketPolicy({
      Bucket: BUCKET,
      Policy: BUCKET_POLICY
    }).promise()
  } catch (error) {
    console.error(`\n\nThe bucket "${BUCKET}" already exists, we’re re-using it, tests may fail.\n`)
  }
}

module.exports = setup
