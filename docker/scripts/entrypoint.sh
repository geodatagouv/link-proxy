#!/usr/bin/env sh

export_docker_secrets() {
  local S3_ACCESS_KEY_FILE="/run/secrets/$S3_ACCESS_KEY_FILE"
  local S3_SECRET_KEY_FILE="/run/secrets/$S3_SECRET_KEY_FILE"

  if [ -f $S3_ACCESS_KEY_FILE ]; then
    export S3_ACCESS_KEY="$(cat "$S3_ACCESS_KEY_FILE")"
  fi

  if [ -f $S3_SECRET_KEY_FILE ]; then
    export S3_SECRET_KEY="$(cat "$S3_SECRET_KEY_FILE")"
  fi
}

export_docker_secrets

exec "$@"
