#!/usr/bin/env bash

# In order for this script to run properly, you will need to install minio/mc locally
# On a Mac, just run `brew install mc`.
#
# Then you will need to add the following `host` configuration to ~/.mc/config.json.
#
# "link-proxy": {
#   "url": "http://localhost:9000",
#   "accessKey": "minio",
#   "secretKey": "minio-s3cr3t",
#   "api": "s3v4"
# }

MINIO_BUCKET=${MINIO_BUCKET:-link-proxy/link-proxy-files}

guard() {
  $@ && echo "✨  Done" || echo "❌  Failed"
}

echo "1️⃣  Drop mongo database"
guard docker run -it --rm mongo:latest mongo link-proxy --host docker.for.mac.host.internal --eval "db.dropDatabase()"

echo

echo "2️⃣  Drop mc bucket"
guard mc rm -r --force $MINIO_BUCKET

echo

echo "3️⃣  Create mc bucket"
guard mc mb $MINIO_BUCKET

echo

echo "4️⃣  Set public policy on mc bucket"
guard mc policy download $MINIO_BUCKET

