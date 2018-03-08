# geoplatform/link-proxy

> Analyze links and extract relevant data.

## Getting started

### Requirements

This requires a few services in order to function properly:

- A MongoDB (>= 3) server:
  - `MONGO_URL` defaults to `mongodb://localhost`
  - `MONGO_DB` defaults to `link-proxy`

- An S3 compatible service:
  - `S3_ENDPOINT` defaults to `http://localhost:9000`
  - `S3_ACCESS_KEY` defaults to `minio`
  - `S3_SECRET_KEY` defaults to `minio-s3cr3t`

- A redis server:
  - `REDIS_HOST` defaults to `localhost`
  - `REDIS_PORT` defaults to `6379`

> The [`docker-compose`](https://github.com/inspireteam/geoplatform/blob/master/docker-compose.yml) file in the root of this repository exposes all these services for an easy development setup.

It also requires the following:

- [Node.js](https://nodejs.org) >= 8
- [unar](https://theunarchiver.com/command-line)


### Services

This exposes two services:

- A web service that you can run using `yarn start:web`.
- A worker service that you can run using `yarn start:worker`.
