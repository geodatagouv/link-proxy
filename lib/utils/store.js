const {S3} = require('aws-sdk')
const {deburr} = require('lodash')

const client = new S3({
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minio-s3cr3t',
  s3ForcePathStyle: true
})

function upload(key, body) {
  const bucket = process.env.S3_BUCKET || 'link-proxy-files'

  key = deburr(key)
    .replace(/_/g, '-')
    .replace(/-{2,}/g, '-')
    .toLowerCase()

  return client
    .upload({
      ACL: 'public-read',
      Bucket: bucket,
      Key: key,
      Body: body
    })
    .promise()
}

module.exports = {client, upload}
