#!/usr/bin/env bats

#
# Some tests for install and some reported edge cases
#

# Load up environment
load ../env
# Load common OSX func
load common

#
# Get us set up for all the tests
#
setup() {
  kbox-setup-preflight
}

# Check that we can install Kalabox.
@test "Check that we can install Kalabox successfully." {

  # Run our uninstaller first just in case
  kbox-uninstall
  # Run the install
  kbox-install
  # Verify the install
  kbox-verify-install

}

# Check that we can uninstall Kalabox.
@test "Check that we can uninstall Kalabox successfully." {

  # Run the uninstaller
  kbox-uninstall
  # Some basic checks that uninstall worked
  kbox-verify-uninstall

}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {
  echo "Test complete."
}
