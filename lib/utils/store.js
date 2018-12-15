const {S3} = require('aws-sdk')
const {deburr} = require('lodash')
const normalizeUrl = require('normalize-url')
const debug = require('debug')('link-proxy:store')

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'
const S3_BUCKET = process.env.S3_BUCKET || 'link-proxy-files'

const client = new S3({
  endpoint: S3_ENDPOINT,
  accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
  secretAccessKey: process.env.S3_SECRET_KEY || 'minio-s3cr3t',
  s3ForcePathStyle: true,
  signatureVersion: 'v4'
})

async function createBucket() {
  try {
    await client.createBucket({
      Bucket: S3_BUCKET
    }).promise()

    debug(`Created ${S3_BUCKET} bucket`)
  } catch (error) {
    if (error.code === 'BucketAlreadyOwnedByYou') {
      debug(`Bucket ${S3_BUCKET} already exists`)
    } else {
      throw error
    }
  }

  await client.putBucketPolicy({
    Bucket: S3_BUCKET,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AddPerm',
          Effect: 'Allow',
          Principal: '*',
          Action: [
            's3:GetObject'
          ],
          Resource: [
            `arn:aws:s3:::${S3_BUCKET}/*`
          ]
        }
      ]
    })
  }).promise()

  debug(`Updated ${S3_BUCKET} policy`)
}

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
      location: normalizeUrl(`${S3_ENDPOINT}/${S3_BUCKET}/${result.Key}`, {
        stripAuthentication: false,
        stripWWW: false,
        removeQueryParameters: [],
        removeTrailingSlash: false
      }),
      etag: result.ETag
    }
  } catch (error) {
    throw error
  }
}

module.exports = {client, upload, createBucket}
