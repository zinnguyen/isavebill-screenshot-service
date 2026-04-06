#!/usr/bin/env bash
set -o errexit
npm install

# Cache Puppeteer Chrome binary between deploys
export PUPPETEER_CACHE_DIR=/opt/render/project/puppeteer

if [[ -d /opt/render/project/src/.cache/puppeteer ]]; then
  echo "...Copying Puppeteer Cache from build cache"
  cp -R /opt/render/project/src/.cache/puppeteer $PUPPETEER_CACHE_DIR || true
else
  echo "...No existing cache found, Puppeteer will download Chrome"
fi

# Run Puppeteer browser install explicitly to ensure Chrome is present
npx puppeteer browsers install chrome
