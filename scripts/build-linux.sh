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
PLUGIN_PANTHEON_VERSION="0.13.0-alpha.1"
PLUGIN_PHP_VERSION="0.13.0-alpha.1"

# Docker things
DOCKER_ENGINE_VERSION="1.9.1"
DOCKER_COMPOSE_VERSION="1.6.2"

# Start up our build directory and go into it
mkdir -p build/installer
mkdir -p build/installer/kalabox
mkdir -p build/installer/kalabox/bin
mkdir -p build/installer/kalabox/services
mkdir -p build/installer/kalabox/docs
cd build/installer/kalabox

# Get our Kalabox dependencies
cp -rf ../../../dist/gui/kalabox-ui/* ./
chmod 755 -Rv ./
cp -rf ../../../dist/cli/kbox-linux-x64-v${KALABOX_VERSION} bin/kbox
cp -rf ../../../plugins/kalabox-services-kalabox/kalabox-compose.yml services/services.yml
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

# Extract DNS
cd ..
curl -fsSL -o dns.rpm "https://github.com/azukiapp/libnss-resolver/releases/download/v0.3.0/fedora20-libnss-resolver-0.3.0-1.x86_64.rpm" && \
  fakeroot -- alien -d dns.rpm --scripts && \
  mkdir -p dns/rpm/data && mkdir -p dns/rpm/control && cd dns/rpm && \
  ar x ./../../libnss-resolver_0.3.0-2_amd64.deb && \
  tar -xzvf control.tar.gz -C control && \
  tar -xvf data.tar.gz -C data || tar -xvf data.tar.xz -C data && \
  cd ../.. && \
  rm -f libnss-resolver_0.3.0-2_amd64.deb && \
  rm -f dns.rpm
curl -fsSL -o dns.deb "https://github.com/azukiapp/libnss-resolver/releases/download/v0.3.0/debian8-0-libnss-resolver_0.3.0_amd64.deb" && \
  mkdir -p dns/deb/data && mkdir -p dns/deb/control && cd dns/deb && \
  ar x ./../../dns.deb && \
  tar -xzvf control.tar.gz -C control && \
  tar -xzvf data.tar.gz -C data
  cd ../.. && \
  rm -f dns.deb

# Back out to install root
mkdir -p dist && \
  cp -rf ../../README.md kalabox/docs/README.md && \
  cp -rf ../../TERMS.md kalabox/docs/TERMS.md && \
  cp -rf ../../LICENSE.md kalabox/docs/LICENSE.md

# Build our two packages
cd ../..
./scripts/build-pkg.sh deb $KALABOX_VERSION
./scripts/build-pkg.sh rpm $KALABOX_VERSION
