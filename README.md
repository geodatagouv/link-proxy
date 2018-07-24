# link-proxy [![CircleCI](https://circleci.com/gh/geodatagouv/link-proxy.svg?style=svg)](https://circleci.com/gh/geodatagouv/link-proxy)

Analyze links and extract relevant data.

[![dependencies Status](https://david-dm.org/geodatagouv/link-proxy/status.svg)](https://david-dm.org/geodatagouv/link-proxy)
[![codecov](https://codecov.io/gh/geodatagouv/link-proxy/branch/master/graph/badge.svg)](https://codecov.io/gh/geodatagouv/link-proxy)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

## Getting started

### Requirements

This requires a few services in order to function properly:

- A MongoDB (>= 3) server:
  - `MONGO_URL` defaults to `mongodb://localhost:27017`
  - `MONGO_DB` defaults to `link-proxy`

- An S3 compatible service:
  - `S3_ENDPOINT` defaults to `http://localhost:9000`
  - `S3_ACCESS_KEY` defaults to `minio`
  - `S3_SECRET_KEY` defaults to `minio-s3cr3t`

- A redis server:
  - `REDIS_HOST` defaults to `localhost`
  - `REDIS_PORT` defaults to `6379`

> The [`docker-compose`](https://github.com/geodatagouv/link-proxy/blob/master/docker/dev/dependencies.yml) file in this repository exposes all these services for an easy development setup.

It also requires the following:

- [Node.js](https://nodejs.org) >= 8
- [unar](https://theunarchiver.com/command-line)


### Services

This exposes two services:

- A web service that you can run using `yarn start:web`.
- A worker service that you can run using `yarn start:worker`.

## Docker

Both services are available as docker images:

### Web service

[![Docker Pulls](https://img.shields.io/docker/pulls/inspireteam/link-proxy-web.svg)](https://hub.docker.com/r/inspireteam/link-proxy-web)

```bash
$ docker pull inspireteam/link-proxy-web:latest
```

### Worker service

[![Docker Pulls](https://img.shields.io/docker/pulls/inspireteam/link-proxy-worker.svg)](https://hub.docker.com/r/inspireteam/link-proxy-worker)

```bash
$ docker pull inspireteam/link-proxy-worker:latest
```

### Development environment

Run all dependency services by using the `dependencies.yml` docker-compose file in [`docker/dev`](https://github.com/geodatagouv/link-proxy/blob/master/docker/dev)

```bash
$ docker-compose -f dependencies.yml up
```

The link-proxy apps are also available in the `apps.yml` file, if you just need to run all the services, run

```bash
$ docker-compose -f dependencies.yml -f apps.yml up
```


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

### `GET /?location=[location]`

Find a link based on its URL. It will redirect (302) to the matching link, if found.

**Example**

```bash
$ curl -v 'localhost:5000/?location=https://geo.data.gouv.fr/robots.txt'

*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 5000 (#0)
> GET /?location=https://geo.data.gouv.fr/robots.txt HTTP/1.1
> Host: localhost:5000
> User-Agent: curl/7.54.0
> Accept: */*
>
< HTTP/1.1 302 Found
< Location: /5aa167645d88a1a73a42995e
< Date: Fri, 09 Mar 2018 15:54:16 GMT
< Connection: keep-alive
< Content-Length: 0
<
* Connection #0 to host localhost left intact
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

## Webhooks

Whenever a link is updated or created, an HTTP notification can be sent to other applications using webhooks.

The following body will be `POST`ed to a listening web service:

```json
{
  "link": "5aa167645d88a1a73a42995e",
  "updatedAt": "2018-03-08T16:40:03.081Z",
  "locations": [
    "https://geo.data.gouv.fr/robots.txt"
  ],
  "action": "created",
  "subLink": false,
  "triggeredBy": {
    "location": "https://geo.data.gouv.fr/robots.txt",
    "link": "5aa167645d88a1a73a42995e",
    "check": 1
  }
}
```

- **`link`**: identifier of the link described by the webhook.<br>
  The data can later be retrieved through the API using the `/:linkId` route.

- **`updatedAt`**: time at which the link has been modified.

- **`locations`**: array of locations of that link.<br>
  For now there will be only one value in the array, it will later be used for resources split across multiple links (for example split archives).

- **`action`**: action of the webhook, can be `created` or `updated` whether the link was first found or its content was updated.

- **`subLink`**: boolean expressing whether the webhook was triggered by running a check on a higher level link or not.<br>
  When this is `true`, there will not be a `check` associated to the link change.

- **`triggeredBy`**: information of what triggered the webhook:
  - `location`: URL that the check was created for.
  - `link`: identifier of the URL that the check was created for.
  - `check`: number of the check.
