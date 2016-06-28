#!/bin/bash

# Uncomment to debug
set -x
set -e

# Kalabox things
KBOX_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat package.json)")
KALABOX_VERSION="$KBOX_VERSION"

# Apps
PLUGIN_PANTHEON_VERSION="0.13.0-alpha.1"
PLUGIN_PHP_VERSION="0.13.0-alpha.1"

# Docker things
DOCKER_MACHINE_VERSION="0.7.0"
DOCKER_COMPOSE_VERSION="1.7.1"
BOOT2DOCKER_ISO_VERSION="1.11.2"

# VirtualBox Things
VBOX_VERSION="5.0.20"
VBOX_REVISION="106931"

# Move dependencies into the application bundle
APP_CONTENTS="Kalabox.app/Contents/MacOS"
APP_BIN="$APP_CONTENTS/bin"
APP_SERVICES="$APP_CONTENTS/services"
APP_PLUGINS="$APP_CONTENTS/plugins"

# Start up our build directory and go into it
mkdir -p build/installer
cd build/installer

# Get our Kalabox dependencies
cp -rf "../../dist/gui/kalabox-ui/Kalabox.app" Kalabox.app
mkdir -p $APP_BIN $APP_SERVICES
cp -rf "../../dist/cli/kbox-osx-x64-v${KALABOX_VERSION}" $APP_BIN/kbox
cp -rf "../../plugins/kalabox-services-kalabox/kalabox-compose.yml" $APP_SERVICES/services.yml
chmod +x $APP_BIN/kbox

# Get our Apps
mkdir -p $APP_PLUGINS/kalabox-app-pantheon $APP_PLUGINS/kalabox-app-php
curl -fsSL "https://github.com/kalabox/kalabox-app-pantheon/releases/download/v$PLUGIN_PANTHEON_VERSION/kalabox-app-pantheon-v$PLUGIN_PANTHEON_VERSION.tar.gz" | tar -xf- -C $APP_PLUGINS/kalabox-app-pantheon
curl -fsSL "https://github.com/kalabox/kalabox-app-php/releases/download/v$PLUGIN_PHP_VERSION/kalabox-app-php-v$PLUGIN_PHP_VERSION.tar.gz" | tar -xf- -C $APP_PLUGINS/kalabox-app-php
cp -rf "../../installer/kalabox.yml" $APP_CONTENTS/kalabox.yml

# Get our Docker dependencies
curl -fsSL -o $APP_BIN/docker-compose "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-Darwin-x86_64"
curl -fsSL -o $APP_BIN/docker-machine "https://github.com/docker/machine/releases/download/v$DOCKER_MACHINE_VERSION/docker-machine-Darwin-x86_64"
curl -fsSL -o $APP_CONTENTS/boot2docker.iso "https://github.com/boot2docker/boot2docker/releases/download/v$BOOT2DOCKER_ISO_VERSION/boot2docker.iso"
chmod +x $APP_BIN/docker-compose
chmod +x $APP_BIN/docker-machine

# Get Virtualbox
curl -fsSL -o vbox.dmg "http://download.virtualbox.org/virtualbox/$VBOX_VERSION/VirtualBox-$VBOX_VERSION-$VBOX_REVISION-OSX.dmg" && \
  mkdir -p /tmp/kalabox/vb && \
  hdiutil attach -mountpoint /tmp/kalabox/vb vbox.dmg && \
  cp -rf /tmp/kalabox/vb/VirtualBox.pkg /tmp/VirtualBox.pkg && \
  xar -xf /tmp/VirtualBox.pkg && \
  hdiutil detach -force /tmp/kalabox/vb && \
  rm -f vbox.dmg && \
  rm -rf Resources && \
  mv *.pkg mpkg/

# kbox.pkg
cd mpkg/kbox.pkg && \
  cd Scripts && find . | cpio -o --format odc | gzip -c > ../Scripts.bin && cd .. && \
  rm -r Scripts && mv Scripts.bin Scripts && \
  mkdir ./rootfs && \
  cd ./rootfs && \
  mv ../../../Kalabox.app . && \
  ls -al . && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%KBOX_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%KBOX_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%KBOX_VERSION%/$KALABOX_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# Add in more version info
sed -i "" -e "s/%KALABOX_VERSION%/$KALABOX_VERSION/g" mpkg/Resources/en.lproj/welcome.rtfd/TXT.rtf mpkg/Distribution
sed -i "" -e "s/%VBOX_VERSION%/$VBOX_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings mpkg/Distribution

# Build the package
mkdir -p dmg && mkdir -p dist && cd mpkg && \
  xar -c --compression=none -f ../dmg/KalaboxInstaller.pkg . && cd .. && \
  mv -f uninstall.sh dmg/uninstall.sh && \
  mv -f kalabox.icns dmg/.VolumeIcon.icns && \
  cp -rf ../../README.md dmg/README.md && \
  cp -rf ../../TERMS.md dmg/TERMS.md && \
  cp -rf ../../LICENSE.md dmg/LICENSE.md && \
  cp -rf ../../ORACLE_VIRTUALBOX_LICENSE dmg/ORACLE_VIRTUALBOX_LICENSE

# This seems to fail on travis periodically so lets add a retry to it
NEXT_WAIT_TIME=0
until hdiutil create -volname Kalabox -srcfolder dmg -ov -format UDZO dist/kalabox.dmg || [ $NEXT_WAIT_TIME -eq 5 ]; do
  sleep $(( NEXT_WAIT_TIME++ ))
done
