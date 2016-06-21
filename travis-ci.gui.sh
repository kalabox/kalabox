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

  # Install grunt cli, bower, and protractor
  npm install -g grunt-cli bower protractor
  gem install sass


  # Sanity checks
  node --version
  npm --version
  grunt --version
  bower --version
  ruby --version
  sass --version
  protractor --version

  sudo apt-get install curl
  export DISPLAY=:99.0
  sh -e /etc/init.d/xvfb start +extension RANDR
  sleep 5

}


# before-script
#
# Before tests run
#
before-script() {

  # Install kalabox
  sudo apt-get -y update
  sudo apt-get -y install iptables cgroup-bin bridge-utils curl git
  curl -fsSL -o /tmp/kalabox.deb "http://installer.kalabox.io/kalabox-latest.deb"
  sudo dpkg -i /tmp/kalabox.deb
}

# script
#
# Run the tests.
#
script() {
  # Basic Grunt testing
  run_command grunt test

  # Install dependencies
  npm install

  # Run protractor tests
  # Disabling protractor tests for now until they work on travis.
  # DISPLAY=:99.0 grunt e2e --verbose
}

# after-script
#
# Run after tests
#
after-script() {
  echo
}

# after-success
#
# GREAT SUCCESS!
#
after-success() {
  echo
}

# before-deploy
#
# Run before deploy
#
before-deploy() {

  # THis is a production release!
  if [ $TRAVIS_PULL_REQUEST == "false" ] &&
    [ ! -z "$TRAVIS_TAG" ] &&
    [ $TRAVIS_REPO_SLUG == "kalabox/kalabox-ui" ]; then

    # Do a production build
    grunt pkg>/dev/null
    mkdir -p prod_build
    mv dist/kalabox-ui* prod_build/

  fi

  # Do the build again for our dev releases
  grunt pkg --dev>/dev/null

  # Rename our build and produce a latest build
  mkdir -p dev_build
  ls -lsa dist

  # Get relevant things to rename our build
  # BUILD_HASH=$(git rev-parse --short HEAD)
  BUILD_VERSION=$(node -pe 'JSON.parse(process.argv[1]).version' "$(cat $TRAVIS_BUILD_DIR/package.json)")

  # Add commit hash to our dev builds
  # cp dist/kalabox-ui-linux64-v$BUILD_VERSION-dev.tar.gz dev_build/kalabox-ui-linux64-v$BUILD_VERSION-$BUILD_HASH-dev.tar.gz
  # cp dist/kalabox-ui-osx64-v$BUILD_VERSION-dev.tar.gz dev_build/kalabox-ui-osx64-v$BUILD_VERSION-$BUILD_HASH-dev.tar.gz
  # cp dist/kalabox-ui-win64-v$BUILD_VERSION-dev.zip dev_build/kalabox-ui-win64-v$BUILD_VERSION-$BUILD_HASH-dev.zip

  # Build latests as well
  cp dist/kalabox-ui-linux64-v$BUILD_VERSION-dev.tar.gz dev_build/kalabox-ui-linux64-latest-dev.tar.gz
  cp dist/kalabox-ui-osx64-v$BUILD_VERSION-dev.tar.gz dev_build/kalabox-ui-osx64-latest-dev.tar.gz
  cp dist/kalabox-ui-win64-v$BUILD_VERSION-dev.zip dev_build/kalabox-ui-win64-latest-dev.zip

}

# after-deploy
#
# Run After deploy
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
