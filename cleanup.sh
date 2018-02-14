#!/usr/bin/env sh

guard() {
  $@ && echo "✨  Done" || echo "❌  Failed"
}

echo "1️⃣  Drop mongo database"
guard docker run -it --rm mongo:latest mongo link-proxy --host docker.for.mac.host.internal --eval "db.dropDatabase()"

echo

echo "2️⃣  Drop mc bucket"
guard mc rm -r --force geoplatform/link-proxy-files

echo

echo "3️⃣  Create mc bucket"
guard mc mb geoplatform/link-proxy-files

echo

echo "4️⃣  Set public policy on mc bucket"
guard mc policy download geoplatform/link-proxy-files

