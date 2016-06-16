#!/bin/bash

COMMAND=$1
EXIT_VALUE=0

##
# SCRIPT COMMANDS
##

# before-install
#
# Do some stuff before npm install
#
before-install() {

  # Gather intel
  echo "TRAVIS_TAG: ${TRAVIS_TAG}"
  echo "TRAVIS_BRANCH: ${TRAVIS_BRANCH}"
  echo "TRAVIS_PULL_REQUEST: ${TRAVIS_PULL_REQUEST}"
  echo "TRAVIS_REPO_SLUG: ${TRAVIS_REPO_SLUG}"
  echo "TRAVIS_BUILD_DIR: ${TRAVIS_BUILD_DIR}"
  echo "TRAVIS_OS_NAME: ${TRAVIS_OS_NAME}"
  echo "PATH: ${PATH}"
  echo "KBOX_PKG_TYPE: $KBOX_PKG_TYPE"
  echo "KBOX_BUILD_PLATFORM: $KBOX_BUILD_PLATFORM"

  # The code is old sir but it checks out
  npm install -g grunt-cli

}

# before-script
#
# Run before tests
#
before-script() {

  # Sanity checks
  node --version
  npm --version
  grunt --version
  jx --version
  jx --jxversion

  #
  # Install kalabox for functional tests if we are on linux
  #
  if [ $TRAVIS_OS_NAME == "linux" ]; then

    # Install kalabox
    sudo apt-get -y update
    sudo apt-get -y install iptables cgroup-bin bridge-utils curl
    curl -fsSL -o /tmp/kalabox.deb "http://installer.kalabox.io/kalabox-latest.deb"
    sudo dpkg -i /tmp/kalabox.deb || true

  fi

}

# before-script
#
# Run before tests
#
before-script() {
  if [ $KBOX_PKG_TYPE == "deb" ]; then
    npm install
  fi
}

# script
#
# Run the tests.
#
script() {
  if [ $KBOX_PKG_TYPE == "deb" ]; then
    grunt test
  fi
}

# after-script
#
# Clean up after the tests.
#
after-script() {
  echo
}

# after-success
#
# Clean up after the tests.
#
after-success() {
  echo
}

# before-deploy
#
# Do stuff before deploy
#
before-deploy() {

  set -e

  # Create a dev build dir
  mkdir -p prod_build
  # Copy the prod release
  cp dist/kalabox.$KBOX_PKG_TYPE prod_build/kalabox-$TRAVIS_TAG.$KBOX_PKG_TYPE
  # Show me the money jerry
  ls -lsa prod_build

  # Create a dev build dir
  mkdir -p dev_build
  # Rename the build and generate latest versions
  cp dist/kalabox.$KBOX_PKG_TYPE dev_build/kalabox-latest.$KBOX_PKG_TYPE
  # Show me the money jerry
  ls -lsa dev_build

}

# after-deploy
#
# Do stuff after deploy
#
after-deploy() {
  echo
}

##
# UTILITY FUNCTIONS:
##

# Sets the exit level to error.
set_error() {
  EXIT_VALUE=1
  echo "$@"
}

# Runs a command and sets an error if it fails.
run_command() {
  set -xv
  if ! $@; then
    set_error
  fi
  set +xv
}

##
# SCRIPT MAIN:
##

# Capture all errors and set our overall exit value.
trap 'set_error' ERR

# We want to always start from the same directory:
cd $TRAVIS_BUILD_DIR

case $COMMAND in
  before-install)
    run_command before-install
    ;;

  install)
    run_command install
    ;;

  before-script)
    run_command before-script
    ;;

  script)
    run_command script
    ;;

  after-script)
    run_command after-script
    ;;

  after-success)
    run_command after-success
    ;;

  before-deploy)
    run_command before-deploy
    ;;

  after-deploy)
    run_command after-deploy
    ;;
esac

exit $EXIT_VALUE
