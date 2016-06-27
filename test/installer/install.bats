#!/usr/bin/env bats

#
# Basic tests to verify that Kalabox has been installed
#

# Load up common environment stuff
load env

# Load OS specific stuff
load "$UNIX_TYPE/common"

#
# Get us set up for all the tests
#
setup() {
  kbox-setup-preflight
  # Location of our dockerfiles
  CMD_DOCKERFILES_DIR=${TRAVIS_BUILD_DIR}/plugins/kalabox-cmd/dockerfiles/
}

# Check that we can install Kalabox.
@test "Check that we can install Kalabox successfully." {
  # Run our uninstaller first just in case
  kbox-uninstall || true
  # Run the install
  kbox-install
}

# Check that the Kalabox CLI is in the PATH
@test "Check that kalabox-cli is in PATH" {
  run which $KBOX
  [ "$status" -eq 0 ]
}

# Check that '$KBOX' returns without error
@test "Check that '$KBOX' returns without error" {
  run $KBOX
  [ "$status" -eq 1 ]
}

# Check that '$KBOX config' returns without error
@test "Check that '$KBOX config' returns without error" {
  run $KBOX config
  [ "$status" -eq 0 ]
}

# Check that '$KBOX create' returns without error
@test "Check that '$KBOX create' returns without error" {
  run $KBOX create
  [ "$status" -eq 1 ]
}

# Check that '$KBOX create' contains 'pantheon' as a choice
@test "Check that '$KBOX create' contains 'pantheon' as a choice" {
  $KBOX create | grep pantheon
}

# Check that '$KBOX env' returns without error
@test "Check that '$KBOX env' returns without error" {
  run $KBOX env
  [ "$status" -eq 0 ]
}

# Check that '$KBOX list' returns without error
@test "Check that '$KBOX list' returns without error" {
  run $KBOX list
  [ "$status" -eq 0 ]
}

# Check that '$KBOX version' returns without error
@test "Check that '$KBOX version' returns without error" {
  run $KBOX version
  [ "$status" -eq 0 ]
}

# Check that core dns container exists
@test "Check that core dns container exists and is running." {
  echo $DOCKER
  $DOCKER inspect kalabox_dns_1 | grep "\"Running\": true"
}

# Check that core proxy container exists
@test "Check that core proxy container exists and is running." {
  $DOCKER inspect kalabox_proxy_1 | grep "\"Running\": true"
}

# Check that DNS has been set
@test "Check that '10.13.37.100' exists in '/etc/resolver/kbox'" {
  cat /etc/resolver/kbox | grep 10.13.37.100
}

# Check that '10.13.37.100' can be pinged
@test "Check that '10.13.37.100' can be pinged" {
  ping -c 1 10.13.37.100
}

# Check that we can build the cli image without an error.
@test "Check that we can build the cli image without an error." {
  run kbox-docker-build-retry kalabox/cli testing $CMD_DOCKERFILES_DIR/cli
  [ "$status" -eq 0 ]
}

# Check that our image version is the stable tag
@test "Check that our image version is the stable tag." {
  cat ${TRAVIS_BUILD_DIR}/plugins/kalabox-cmd/kalabox-compose.yml | grep "image: kalabox/cli:" | grep "stable"
}

# Check that we can compile native stuff with node-gyp.
@test "Check that we can compile native stuff with node-gyp." {
  run $DOCKER run --entrypoint npm kalabox/cli:testing install -g node-sass
  [ "$status" -eq 0 ]
}

# Check that we can uninstall Kalabox.
@test "Check that we can uninstall Kalabox successfully." {
  kbox-uninstall
}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  sleep 1
  echo "Test complete."
}
