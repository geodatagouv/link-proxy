const store = require('./lib/utils/store')

async function teardown() {
  const bucket = process.env.S3_BUCKET

  const objects = await store.client.listObjects({Bucket: bucket}).promise()
  await store.client.deleteObjects({
    Bucket: bucket,
    Delete: {Objects: objects.Contents.map(({Key}) => ({Key}))}
  }).promise()

  await store.client.deleteBucket({Bucket: bucket}).promise()

  console.log(`\nThe bucket "${bucket}" was emptied and removed.`)
}

module.exports = teardown
