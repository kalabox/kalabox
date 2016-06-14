#!/bin/bash

# Get the args
PKG_TYPE=$1
PKG_VERSION=$2

# Get our build env
source /install/scripts/env.sh

# Build pkg install scripts
/install/scripts/build_scripts.sh preinst $PKG_TYPE
/install/scripts/build_scripts.sh postinst $PKG_TYPE
/install/scripts/build_scripts.sh prerm $PKG_TYPE
/install/scripts/build_scripts.sh postrm $PKG_TYPE

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
  -C /install \
  /desktop/kalabox-ui.desktop=/usr/share/applications/kalabox-ui.desktop \
  /desktop/kalabox.png=/usr/share/kalabox/kalabox.png \
  /network/bridgeup=/usr/share/kalabox/scripts/bridgeup \
  /daemon/daemonup=/usr/share/kalabox/scripts/daemonup \
  /init/upstart/kalabox.conf=/etc/init/kalabox.conf \
  /init/sysv/kalabox=/etc/init.d/kalabox \
  /init/systemd/kalabox.service=/lib/systemd/system/kalabox.service \
  /Kalabox=/usr/share/kalabox/gui \
  /docker-compose=/usr/share/kalabox/bin/docker-compose \
  /docker=/usr/share/kalabox/bin/docker \
  /kbox=/usr/local/bin/kbox \
  /docs=/usr/share/kalabox \
  /services.yml=/usr/share/kalabox/services/services.yml \
  /dns/$PKG_TYPE/data/etc=/ \
  /dns/$PKG_TYPE/data/usr=/
