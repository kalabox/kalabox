#!/bin/bash

# Set some infoz
PACKAGE_URL="https://www.kalabox.io/"
PACKAGE_MAINTAINER="Mike Pirog <mike@kalabox.io>"
PACKAGE_DESCRIPTION="The fastest and easiest local dev with docker."
PACKAGE_LICENSE="MIT"
INSTALLER_VERSION=0.12.0-alpha.1
EXTRA_PKGS=cgroup-lite

# Get the script type
PKG_TYPE=$1
DNS_SCRIPTS_DIR=/install/dns/control
KALABOX_SCRIPTS_DIR=/install/scripts

# Build pkg install scripts
/install/scripts/build_scripts.sh preinst $PKG_TYPE
/install/scripts/build_scripts.sh postinst $PKG_TYPE
/install/scripts/build_scripts.sh prerm $PKG_TYPE
/install/scripts/build_scripts.sh postrm $PKG_TYPE

# Add platform specific deps
if [ "$1" == "rpm" ]; then
  EXTRA_PKGS=libcgroup
fi

# Build a debian package
fpm -s dir -t $PKG_TYPE \
  --package /kalabox.$PKG_TYPE \
  --name kalabox \
  --force \
  --description "$PACKAGE_DESCRIPTION" \
  --maintainer "$PACKAGE_MAINTAINER" \
  --url "$PACKAGE_URL" \
  --license "$PACKAGE_LICENSE" \
  --after-install /$PKG_TYPE/postinst \
  --before-install /$PKG_TYPE/preinst \
  --after-remove /$PKG_TYPE/postrm \
  --before-remove /$PKG_TYPE/prerm \
  --version $INSTALLER_VERSION \
  --depends bridge-utils \
  --depends iptables \
  --depends "$EXTRA_PKGS" \
  --config-files /etc/init/kalabox.conf \
  --config-files /etc/init.d/kalabox \
  --config-files /etc/default/kalabox \
   --config-files /etc/resolver/default.dev \
  -C /install \
  /desktop/kalabox-ui.desktop=/usr/share/applications/kalabox-ui.desktop \
  /desktop/kalabox.png=/usr/share/kalabox/kalabox.png \
  /network/bridgeup=/usr/share/kalabox/scripts/bridgeup \
  /daemon/daemonup=/usr/share/kalabox/scripts/daemonup \
  /init/upstart/kalabox.conf=/etc/init/kalabox.conf \
  /init/sysv/kalabox=/etc/init.d/kalabox \
  /init/sysv/kalabox.default=/etc/default/kalabox \
  /init/systemd/kalabox.service=/lib/systemd/system/kalabox.service \
  /Kalabox=/usr/share/kalabox/gui \
  /docker-compose=/usr/share/kalabox/bin/docker-compose \
  /docker=/usr/share/kalabox/bin/docker \
  /kbox=/usr/local/bin/kbox \
  /docs=/usr/share/kalabox \
  /services.yml=/usr/share/kalabox/services/services.yml \
  /dns/$PKG_TYPE/data/etc=/ \
  /dns/$PKG_TYPE/data/usr=/
