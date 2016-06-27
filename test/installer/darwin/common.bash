#!/usr/bin/env bats

#
# Some helpful functions we can reuse across tests
#

#
# Make sure we are all set up to run tests
#
kbox-setup-preflight() {

  set -e

  if [ ! -f "./dist/$KALABOX_PKG" ]; then
    echo "You dont have a kalabox installer to use. Please run 'grunt pkg' first."
    exit 1
  fi

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
# Run the Kalabox uninstall
#
kbox-uninstall() {
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S "$KBOX_UNINSTALL" -f
}

#
# Function to rety docker builds if they fail
#
kbox-docker-build-retry() {

  # Get args
  IMAGE=$1
  TAG=$2
  DOCKERFILE=$3

  # Try a few times
  NEXT_WAIT_TIME=0
  until $DOCKER build -t $IMAGE:$TAG $DOCKERFILE || [ $NEXT_WAIT_TIME -eq 5 ]; do
    sleep $(( NEXT_WAIT_TIME++ ))
  done

  # If our final try has been met we assume failure
  #
  # @todo: this can be better since this could false negative
  #        on the final retry
  #
  if [ $NEXT_WAIT_TIME -eq 5 ]; then
    exit 666
  fi

}
