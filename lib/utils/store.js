const {S3} = require('aws-sdk')
const {deburr} = require('lodash')

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'
const S3_BUCKET = process.env.S3_BUCKET || 'link-proxy-files'

const client = new S3({
  endpoint: S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minio-s3cr3t',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
})

async function upload(key, body) {
  key = deburr(key)
    .replace(/_/g, '-')
    .replace(/-{2,}/g, '-')
    .toLowerCase()

  try {
    const result = await client
      .upload({
        ACL: 'public-read',
        Bucket: S3_BUCKET,
        Key: key,
        Body: body
      })
      .promise()

    // Rebuild the location instead of using result.Location.
    // There seems to be an issue when MINIO_DOMAIN (on minio configuration) includes a subdomain.
    // When that happens, s3ForcePathStyle is not respected and the bucket is used as a subdomain,
    // as if the request was made as a virtual-host-style request.
    return {
      location: `${S3_ENDPOINT}/${S3_BUCKET}/${result.Key}`,
      etag: result.Etag
    }
  } catch (error) {
    throw error
  }
}

module.exports = {client, upload}
