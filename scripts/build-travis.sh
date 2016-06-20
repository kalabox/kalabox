#!/bin/bash

# This is a production release!
if [ $TRAVIS_PULL_REQUEST == "false" ] &&
  [ ! -z "$TRAVIS_TAG" ] &&
  [ $TRAVIS_REPO_SLUG == "kalabox/kalabox" ]; then

  # Do a production build
  grunt pkg
  mkdir -p prod_build
  cp -rf dist/kalabox.$KBOX_PKG_TYPE prod_build/kalabox-$TRAVIS_TAG.$KBOX_PKG_TYPE

fi

# Do the build again for our dev releases
grunt pkg --dev
mkdir -p dev_build

cp -rf dist/kalabox.$KBOX_PKG_TYPE dev_build/kalabox-latest-dev.$KBOX_PKG_TYPE
