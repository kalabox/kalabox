#!/bin/bash

# Get the args
PKG_TYPE=$1
PKG_VERSION=$2

# Get our build env
source ./scripts/env.sh

# Build pkg install scripts
./scripts/build-scripts.sh preinst $PKG_TYPE
./scripts/build-scripts.sh postinst $PKG_TYPE
./scripts/build-scripts.sh prerm $PKG_TYPE
./scripts/build-scripts.sh postrm $PKG_TYPE

# Build a $PKG_TYPE package
fpm -s dir -t $PKG_TYPE \
  --package "$PKG_PKG" \
  --name "$PKG_NAME" \
  --description "$PKG_DESCRIPTION" \
  --maintainer "$PKG_MAINTAINER" \
  --url "$PKG_URL" \
  --license "$PKG_LICENSE" \
  --version "$PKG_VERSION" \
  $PKG_EXTRA_OPTS \
  $PKG_SCRIPTS \
  $PKG_DEPS \
  -C build/installer \
  kalabox=/usr/share \
  desktop/kalabox.desktop=/usr/share/applications/kalabox.desktop \
  desktop/kalabox.png=/usr/share/kalabox/kalabox.png \
  network/bridgeup=/usr/share/kalabox/scripts/bridgeup \
  daemon/daemonup=/usr/share/kalabox/scripts/daemonup \
  init/upstart/kalabox.conf=/etc/init/kalabox.conf \
  init/sysv/kalabox=/etc/init.d/kalabox \
  init/systemd/kalabox.service=/lib/systemd/system/kalabox.service \
  dns/$PKG_TYPE/data/etc=/ \
  dns/$PKG_TYPE/data/usr=/
