#!/usr/bin/env bats

#
# Some tests for install and some reported edge cases
#

# Load up common environment stuff
load ../env

# Load OS specific stuff
load common

#
# Get us set up for all the tests
#
setup() {

  # Do the preflight
  kbox-setup-preflight

}

#
# Check that we can install Kalabox on debian/ubuntu using only the cgroup-bin pkg
#
# See: https://github.com/kalabox/kalabox/issues/1206
#
@test "Install Kalabox on Debian/Linux with ONLY the cgroup-bin pkg" {

  #
  # Skip this test on non-debian
  #
  if [ "${FLAVOR}" != "debian" ]; then
    skip "Test only applies to debian systems"
  fi

  # Make sure cgroup-lite is purged
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S $LINUX_DEP_REMOVE cgroup-lite || true

  # Install cgroup-bin
  echo "${KBOX_SUDO_PASSWORD}" | sudo -S $LINUX_DEP_INSTALL cgroup-bin

  # Run the install
  kbox-install

}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  sleep 1
}
