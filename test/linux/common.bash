#!/usr/bin/env bats

#
# Some helpful functions we can reuse across tests
#

#
# Make sure we are all set up to run tests
#
kbox-setup-preflight() {

  set -e

  # Build our installer
  make linux

  # Check it exists
  stat ./dist/$KALABOX_PKG

}

#
# Run the kalabox install
#
kbox-install() {

  # Loop through to install our DEPS
  for i in "${DEPS[@]}"
  do
    echo "${KBOX_SUDO_PASSWORD}" | sudo -S $LINUX_DEP_INSTALL $i
  done

  # Install kalabox
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S $LINUX_PKG_INSTALL dist/kalabox.deb

}

#
# Verify the Kakabox install
#
kbox-verify-install() {

  # Get our CLI binary
  KBOX=$(which kbox)

  # Get our installed docker binary
  KDOCKER=/usr/share/kalabox/bin/docker

  # Check some basic commands
  $KBOX config
  $KBOX create | grep drupal7
  $KBOX env
  $KBOX list
  $KBOX version

  # Some basic service checks
  DOCKER_HOST=tcp://10.13.37.100:2375 $KDOCKER inspect kalabox_dns_1 | grep "\"Running\": true"
  DOCKER_HOST=tcp://10.13.37.100:2375 $KDOCKER inspect kalabox_proxy_1 | grep "\"Running\": true"

  # Check our IP address
  cat /etc/resolver/kbox | grep $KALABOX_IP
  ping -c 1 $KALABOX_IP

  # Check for NW app's existence
  stat /usr/share/kalabox/gui/Kalabox

}

#
# Run the Kalabox uninstall
#
kbox-uninstall() {

  # Loop through to remove our DEPS
  #for i in "${DEPS[@]}"
  #do
  #  echo "${KBOX_SUDO_PASSWORD}" | sudo -S $LINUX_DEP_REMOVE $i
  #done

  # Uninstall kalabox as well
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S $LINUX_PKG_REMOVE kalabox

}

#
# Verify the Kalabox uninstall
#
kbox-verify-uninstall() {

  # Check that the app is removed
  run stat /usr/share/kalabox/gui/Kalabox || \
  # Check that the CLI is gone
  run which kbox || \
  # Check that we cannot ping the IP
  ping -c 1 $KALABOX_IP
  # Check
  [ "$status" -eq 1 ]

}
