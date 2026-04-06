#!/usr/bin/env bash
set -o errexit
npm install
if [[ ! -d $PUPPETEER_CACHE_DIR ]]; then
  echo "...Copying Puppeteer Cache from Build Cache"
  cp -R /opt/render/project/src/.cache/puppeteer/ $PUPPETEER_CACHE_DIR || true
else
  echo "...Storing Puppeteer Cache in Build Cache"
  cp -R $PUPPETEER_CACHE_DIR /opt/render/project/src/.cache/puppeteer/ || true
fi
