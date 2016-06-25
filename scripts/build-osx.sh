#!/bin/bash

# Uncomment to debug
set -xe

# Kalabox things
KBOX_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat package.json)")
INSTALLER_VERSION="$KBOX_VERSION"
KALABOX_CLI_VERSION="$KBOX_VERSION"
KALABOX_GUI_VERSION="$KBOX_VERSION"
KALABOX_IMAGE_VERSION="v0.12"

# Docker things
DOCKER_MACHINE_VERSION="0.7.0"
DOCKER_COMPOSE_VERSION="1.7.1"
BOOT2DOCKER_ISO_VERSION="1.11.2"

# VirtualBox Things
VBOX_VERSION="5.0.20"
VBOX_REVISION="106931"

# Start up our build directory and go into it
mkdir -p build/installer
cd build/installer

# Get our Kalabox dependencies
cp -rf "../../dist/cli/kbox-osx-x64-v${KALABOX_CLI_VERSION}" kbox
cp -rf "../../dist/gui/kalabox-ui/Kalabox.app" Kalabox.app
curl -fsSL -o services.yml "https://raw.githubusercontent.com/kalabox/kalabox-cli/$KALABOX_IMAGE_VERSION/plugins/kalabox-services-kalabox/kalabox-compose.yml"
chmod +x kbox

# Get our Docker dependencies
curl -fsSL -o docker-compose "https://github.com/docker/compose/releases/download/$DOCKER_COMPOSE_VERSION/docker-compose-Darwin-x86_64"
curl -fsSL -o docker-machine "https://github.com/docker/machine/releases/download/v$DOCKER_MACHINE_VERSION/docker-machine-Darwin-x86_64"
curl -fsSL -o boot2docker.iso "https://github.com/boot2docker/boot2docker/releases/download/v$BOOT2DOCKER_ISO_VERSION/boot2docker.iso"
chmod +x docker-compose
chmod +x docker-machine

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

# Add dockermachine.pkg
cd mpkg/dockermachine.pkg && \
  mkdir rootfs && \
  cd rootfs && \
  mkdir -p tmp && \
  mv ../../../docker-machine tmp/ && \
  ls -al tmp/ && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%DOCKERMACHINE_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%DOCKERMACHINE_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%DOCKERMACHINE_VERSION%/$DOCKER_MACHINE_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# Add dockercompose.pkg
cd mpkg/dockercompose.pkg && \
  mkdir rootfs && \
  cd rootfs && \
  mkdir -p tmp && \
  mv ../../../docker-compose tmp/ && \
  ls -al tmp/ && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%DOCKERCOMPOSE_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%DOCKERCOMPOSE_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%DOCKERCOMPOSE_VERSION%/$DOCKER_COMPOSE_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# Add boot2dockeriso.pkg
cd mpkg/boot2dockeriso.pkg && \
  cd Scripts && find . | cpio -o --format odc | gzip -c > ../Scripts.bin && cd .. && \
  rm -r Scripts && mv Scripts.bin Scripts && \
  mkdir ./rootfs && \
  cd ./rootfs && \
  mv ../../../boot2docker.iso . && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%BOOT2DOCKER_ISO_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%BOOT2DOCKER_ISO_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%BOOT2DOCKER_ISO_VERSION%/$BOOT2DOCKER_ISO_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# engine.pkg
cd mpkg/engine.pkg && \
  cd Scripts && find . | cpio -o --format odc | gzip -c > ../Scripts.bin && cd .. && \
  rm -r Scripts && mv Scripts.bin Scripts && \
  mkdir ./rootfs && \
  cd ./rootfs && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%ENGINE_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%ENGINE_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%ENGINE_VERSION%/$BOOT2DOCKER_ISO_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# services.pkg
cd mpkg/services.pkg && \
  cd Scripts && find . | cpio -o --format odc | gzip -c > ../Scripts.bin && cd .. && \
  rm -r Scripts && mv Scripts.bin Scripts && \
  mkdir ./rootfs && \
  cd ./rootfs && \
  mkdir -p tmp && \
  mv ../../../services.yml tmp/ && \
  ls -al tmp/ && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%SERVICES_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%SERVICES_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%SERVICES_VERSION%/$KALABOX_IMAGE_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# kbox.pkg
cd mpkg/kbox.pkg && \
  mkdir rootfs && \
  cd rootfs && \
  mkdir -p usr/local/bin && \
  mv ../../../kbox usr/local/bin/ && \
  ls -al /usr/local/bin/ && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%KBOXCLI_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%KBOXCLI_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%KBOXCLI_VERSION%/$KALABOX_CLI_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# kbox-gui.pkg
cd mpkg/kbox-gui.pkg && \
  mkdir ./rootfs && \
  cd ./rootfs && \
  mv ../../../Kalabox.app . && \
  ls -al . && \
  find . | cpio -o --format odc | gzip -c > ../Payload && \
  mkbom . ../Bom && \
  sed -i "" \
    -e "s/%KBOXGUI_NUMBER_OF_FILES%/`find . | wc -l`/g" \
    ../PackageInfo && \
  sed -i "" \
    -e "s/%KBOXGUI_INSTALL_KBYTES%/`du -sk | cut -f1`/g" \
    ../PackageInfo ../../Distribution && \
  sed -i "" \
    -e "s/%KBOXGUI_VERSION%/$KALABOX_GUI_VERSION/g" \
    ../PackageInfo ../../Distribution && \
  cd .. && \
  rm -rf rootfs && \
  cd ../..

# Add in more version info
sed -i "" -e "s/%INSTALLER_VERSION%/$INSTALLER_VERSION/g" mpkg/Resources/en.lproj/welcome.rtfd/TXT.rtf mpkg/Distribution
sed -i "" -e "s/%VBOX_VERSION%/$VBOX_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings mpkg/Distribution
sed -i "" -e "s/%DOCKERMACHINE_VERSION%/$DOCKER_MACHINE_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings
sed -i "" -e "s/%DOCKERCOMPOSE_VERSION%/$DOCKER_COMPOSE_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings
sed -i "" -e "s/%BOOT2DOCKER_ISO_VERSION%/$BOOT2DOCKER_ISO_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings
sed -i "" -e "s/%KBOXCLI_VERSION%/$KALABOX_CLI_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings
sed -i "" -e "s/%KBOXGUI_VERSION%/$KALABOX_GUI_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings
sed -i "" -e "s/%SYNCTHING_VERSION%/$SYNCTHING_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings
sed -i "" -e "s/%ENGINE_VERSION%/$SYNCTHING_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings
sed -i "" -e "s/%SERVICES_VERSION%/$KALABOX_IMAGE_VERSION/g" mpkg/Resources/en.lproj/Localizable.strings

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
