#!/bin/bash

# Uncomment to debug
set -x
set -e

# Check to see that we have the correct dependencies
if [ ! $(type -p fpm) ] || [ ! $(type -p alien) ]; then
  echo "You do not have the correct dependencies installed to build Kalabox. Trying to install them..."
  sudo ./scripts/install-deps.sh
  gem install --verbose fpm || sudo gem install --verbose fpm
fi

# Kalabox things
KBOX_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat package.json)")
KALABOX_VERSION="$KBOX_VERSION"

# Apps
PLUGIN_PANTHEON_VERSION="2.1.0"
PLUGIN_PHP_VERSION="2.1.0"

# Docker things
DOCKER_ENGINE_VERSION="1.9.1"
DOCKER_COMPOSE_VERSION="1.6.2"

# Start up our build directory and go into it
mkdir -p build/installer
mkdir -p build/installer/kalabox
mkdir -p build/installer/kalabox/bin
mkdir -p build/installer/kalabox/docs
cd build/installer/kalabox

# Get our Kalabox dependencies
cp -rf ../../../dist/gui/kalabox-ui/* ./
cp -rf ../../../dist/cli/kbox-linux-x64-v${KALABOX_VERSION} bin/kbox
chmod +x bin/kbox

# Get our app dependencies
mkdir -p plugins/kalabox-app-pantheon plugins/kalabox-app-php
curl -fsSL "https://github.com/kalabox/kalabox-app-pantheon/releases/download/v$PLUGIN_PANTHEON_VERSION/kalabox-app-pantheon-v$PLUGIN_PANTHEON_VERSION.tar.gz" | tar -xz -C plugins/kalabox-app-pantheon
curl -fsSL "https://github.com/kalabox/kalabox-app-php/releases/download/v$PLUGIN_PHP_VERSION/kalabox-app-php-v$PLUGIN_PHP_VERSION.tar.gz" | tar -xz -C plugins/kalabox-app-php
cp -rf ../../../installer/kalabox.yml kalabox.yml

# Get our Docker dependencies
curl -fsSL -o bin/docker "https://get.docker.com/builds/Linux/x86_64/docker-$DOCKER_ENGINE_VERSION"
curl -fsSL -o bin/docker-compose "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-Linux-x86_64"
chmod +x bin/docker
chmod +x bin/docker-compose

# Back out to install root
cd .. && mkdir -p dist && \
  cp -rf ../../README.md kalabox/docs/README.md && \
  cp -rf ../../TERMS.md kalabox/docs/TERMS.md && \
  cp -rf ../../LICENSE.md kalabox/docs/LICENSE.md

# Build our two packages
cd ../..
./scripts/build-pkg.sh deb $KALABOX_VERSION
./scripts/build-pkg.sh rpm $KALABOX_VERSION
