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

}

# install
#
# Install our project
#
install() {
  set -e
  make $KALABOX_BUILD_PLATFORM
}


# before-script
#
# Run before tests
#
before-script() {
  if [ $KALABOX_BUILD_PLATFORM == "linux" ]; then
    npm install
  fi
}

# script
#
# Run the tests.
#
script() {
  if [ $KALABOX_BUILD_PLATFORM == "linux" ]; then
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

  # Build things
  BUILD_VERSION=${TRAVIS_TAG:-$TRAVIS_BRANCH}
  echo $BUILD_VERSION

  # Rename the builds and generate latest versions
  if [ $KALABOX_BUILD_PLATFORM == "osx" ]; then
    mv dist/kalabox.dmg dist/kalabox-$BUILD_VERSION.dmg
    cp dist/kalabox-$BUILD_VERSION.dmg dist/kalabox-latest.dmg
  fi

  if [ $KALABOX_BUILD_PLATFORM == "windows" ]; then
    mv dist/kalabox.exe dist/kalabox-$BUILD_VERSION.exe
    cp dist/kalabox-$BUILD_VERSION.exe dist/kalabox-latest.exe
  fi

  if [ $KALABOX_BUILD_PLATFORM == "linux" ]; then
    mv dist/kalabox.deb dist/kalabox-$BUILD_VERSION.deb
    cp dist/kalabox-$BUILD_VERSION.deb dist/kalabox-latest.deb

    mv dist/kalabox.rpm dist/kalabox-$BUILD_VERSION.rpm
    cp dist/kalabox-$BUILD_VERSION.rpm dist/kalabox-latest.rpm
  fi

  # Show me the money jerry
  ls -lsa dist

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
