#!/usr/bin/env bats

#
# Some helpful functions we can reuse across tests
#

#
# Make sure we are all set up to run tests
#
kbox-setup-preflight() {

  # Build our installer
  make linux

  # Check it exists
  stat ./dist/$KALABOX_PKG

}

#
# Run the kalabox install
#
kbox-install() {
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S $LINUX_PKG_MANAGER ./dist/$KALABOX_PKG
}

#
# Verify the Kakabox install
#
kbox-verify-install() {

   # Get our CLI binary
  KBOX=$(which kbox)

  # Check some basic commands
  $KBOX config
  $KBOX create | grep drupal7
  $KBOX env
  $KBOX list
  $KBOX version

  # Some basic service checks
  $DOCKER inspect kalabox_dns_1 | grep "\"Running\": true"
  $DOCKER inspect kalabox_proxy_1 | grep "\"Running\": true"

  # Check our IP address
  KALABOX_IP=10.13.37.100
  cat /etc/resolver/kbox | grep $KALABOX_IP
  ping -c 1 $KALABOX_IP

  # Check for app's existence
  stat /usr/share/kalabox/gui/kalabox

}

#
# Run the Kalabox uninstall
#
kbox-uninstall() {
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S
}

#
# Verify the Kalabox uninstall
#
kbox-verify-uninstall() {

  # Check that the app is removed
  run stat /Applications/Kalabox.app || \
  # Check that the CLI is gone
  run which kbox || \
  # Check that the VM is gone
  run docker-machine ls | grep Kalabox2
  [ "$status" -eq 1 ]

}
