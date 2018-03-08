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

> The [`docker-compose`](https://github.com/inspireteam/geoplatform/blob/master/docker/docker-compose.yml) file in the root of this repository exposes all these services for an easy development setup.

It also requires the following:

- [Node.js](https://nodejs.org) >= 8
- [unar](https://theunarchiver.com/command-line)


### Services

This exposes two services:

- A web service that you can run using `yarn start:web`.
- A worker service that you can run using `yarn start:worker`.


## Web API

### `POST /`

Create a check for a given URL.

It takes a JSON object with a required `location` property, containing the URL to check.

**Example**

```bash
$ curl localhost:5000 -d '{"location": "https://geo.data.gouv.fr/robots.txt"}'

{
  "_id": "5aa167645d88a1a73a42995e",
  "createdAt": "2018-03-08T16:40:03.011Z",
  "locations": [
    "https://geo.data.gouv.fr/robots.txt"
  ],
  "updatedAt": "2018-03-08T16:40:03.011Z"
}
```

### `GET /:linkId`

Retrieve all the downloads for the given link.

**Example**

```bash
$ curl localhost:5000/5aa167645d88a1a73a42995e

{
  "_id": "5aa167645d88a1a73a42995e",
  "createdAt": "2018-03-08T16:40:03.011Z",
  "updatedAt": "2018-03-08T16:40:03.081Z",
  "locations": [
    "https://geo.data.gouv.fr/robots.txt"
  ],
  "downloads": [
    {
      "createdAt": "2018-03-08T16:40:03.094Z",
      "type": "document",
      "archive": false,
      "files": [
        "robots.txt"
      ],
      "url": "http://localhost:9000/link-proxy-files/geo.data.gouv.fr/2018-03-08/5aa16763670cb515e9bf2d12-robots.txt"
    }
  ]
}
```

### `GET /:linkId/checks`

Retrieve the list of the past 20 checks for a link.

**Example**

```bash
$ curl localhost:5000/5aa167645d88a1a73a42995e/checks

[
  {
  "number": 1,
  "createdAt": "2018-03-08T16:40:03.011Z",
  "updatedAt": "2018-03-08T16:40:03.081Z",
  "state": "finished",
  "statusCode": 200
  }
]
```
