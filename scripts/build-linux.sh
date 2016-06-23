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
INSTALLER_VERSION="$KBOX_VERSION"
KALABOX_CLI_VERSION="$KBOX_VERSION"
KALABOX_GUI_VERSION="$KBOX_VERSION"
KALABOX_IMAGE_VERSION="v0.12"

# Docker things
DOCKER_ENGINE_VERSION="1.9.1"
DOCKER_COMPOSE_VERSION="1.7.1"

# Start up our build directory and go into it
mkdir -p build/installer/pkg
cd build/installer/pkg

# Get our Kalabox dependencies
cp -rf "../../../dist/cli/kbox-linux-x64-v${KALABOX_CLI_VERSION}" kbox
cp -rf "../../../dist/gui/kalabox-ui" gui
curl -fsSL -o services.yml "https://raw.githubusercontent.com/kalabox/kalabox-cli/$KALABOX_IMAGE_VERSION/plugins/kalabox-services-kalabox/kalabox-compose.yml"
chmod +x kbox
chmod 755 -Rv gui

# Get our Docker dependencies
curl -fsSL -o docker "https://get.docker.com/builds/Linux/x86_64/docker-$DOCKER_ENGINE_VERSION"
curl -fsSL -o docker-compose "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-Linux-x86_64"
chmod +x docker
chmod +x docker-compose

# Extract DNS
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
cd ..
mkdir -p pkg/docs && mkdir -p dist && \
  cp -rf scripts pkg/scripts && \
  cp -rf network pkg/network && \
  cp -rf daemon pkg/daemon && \
  cp -rf desktop pkg/desktop && \
  cp -rf init pkg/init && \
  cp -rf ../../README.md pkg/docs/README.md && \
  cp -rf ../../TERMS.md pkg/docs/TERMS.md && \
  cp -rf ../../LICENSE.md pkg/docs/LICENSE.md

# Build our two packages
cd ../..
./scripts/build-pkg.sh deb $INSTALLER_VERSION
./scripts/build-pkg.sh rpm $INSTALLER_VERSION
