#!/usr/bin/env bats

#
# Some helpful functions we can reuse across tests
#

#
# Make sure we are all set up to run tests
#
kbox-setup-preflight() {

  # Check if we need the installer
  : ${KBOX_NEEDS_INSTALLER:=$("$DOCKER_MACHINE" ls --filter name="$KBOX_INSTALLER" | grep "$KBOX_INSTALLER" > /dev/null && echo 0 || echo $?)}
  if [ $KBOX_NEEDS_INSTALLER != 0 ]; then
    "$DOCKER_MACHINE" create -d virtualbox $KBOX_INSTALLER
  fi

  # Start the machine if needed
  if [ $($DOCKER_MACHINE status $KBOX_INSTALLER) != "Running" ]; then
    "$DOCKER_MACHINE" start $KBOX_INSTALLER
  fi

  # Set the environment correctly and verify it
  #
  #   # Example Environment
  #   export DOCKER_TLS_VERIFY="1"
  #   export DOCKER_HOST="tcp://192.168.99.100:2376"
  #   export DOCKER_CERT_PATH="/Users/pirog/.docker/machine/machines/kbox-installer"
  #   export DOCKER_MACHINE_NAME="kbox-installer"
  #
  eval "$($DOCKER_MACHINE env $KBOX_INSTALLER)"
  env | grep DOCKER_TLS_VERIFY
  env | grep DOCKER_HOST
  env | grep DOCKER_CERT_PATH
  env | grep DOCKER_MACHINE_NAME

  # Build our installer
  make osx

  # Check it exists
  stat ./dist/kalabox.dmg

}

#
# Run the kalabox install
#
kbox-install() {

  # Make sure we dont already have a mounted thing
  hdiutil detach "/Volumes/Kalabox" || true
  # Mount the kalabox.dmg
  hdiutil attach "./dist/kalabox.dmg"
  # Install the package
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S installer -pkg "/Volumes/Kalabox/KalaboxInstaller.pkg" -target /
  # DISSSSSMOUNT
  hdiutil detach "/Volumes/Kalabox"

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
  $DOCKER_MACHINE ssh Kalabox2 docker inspect kalabox_dns_1 | grep "\"Running\": true"
  $DOCKER_MACHINE ssh Kalabox2 docker inspect kalabox_proxy_1 | grep "\"Running\": true"

  # Check our IP address
  KALABOX_IP=$("$DOCKER_MACHINE" ip Kalabox2)
  cat /etc/resolver/kbox | grep $KALABOX_IP
  ping -c 1 $KALABOX_IP

  # Check for app's existence
  stat /Applications/Kalabox.app

}

#
# Run the Kalabox uninstall
#
kbox-uninstall() {
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S "$KBOX_UNINSTALL" -f
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
