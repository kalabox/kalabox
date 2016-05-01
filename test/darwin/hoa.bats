#!/usr/bin/env bats

#
# Some tests for install and some reported edge cases
#

# Load up common environment stuff
load ../env

# Load OS specific stuff
load common
load env

#
# Get us set up for all the tests
#
setup() {

  # Do the preflight
  kbox-setup-preflight

  # Get our dup HOAs
  HOA_DUP_1=vboxnet$((${KBOX_LAST_HOA: -1} + 1))
  HOA_DUP_2=vboxnet$((${KBOX_LAST_HOA: -1} + 2))

  # And make them a list
  HOAS=( $HOA_DUP_1 $HOA_DUP_2 )

  # Obscure IP to test against
  HOA_IP=10.73.31.1

}

#
# Check that we can install Kalabox when there are duplicate
# host only adapters.
#
# See: https://github.com/kalabox/kalabox/issues/1220
#
@test "Install Kalabox with duplicate host-only adapters" {

  #
  # Skip this test until we have a resolution
  #
  # See: https://github.com/kalabox/kalabox/issues/1268
  #      https://github.com/kalabox/kalabox/issues/1220
  #
  skip "See https://github.com/kalabox/kalabox/issues/1220"

  # Loop through our HOA
  for HOA in "${HOAS[@]}"
  do
    vboxmanage hostonlyif create
    vboxmanage hostonlyif ipconfig --ip $HOA_IP $HOA
  done

  # Run our uninstaller first just in case
  kbox-uninstall

  # Run the install
  kbox-install

  # Verify the install
  kbox-verify-install

}

#
# BURN IT TO THE GROUND!!!!
#
teardown() {

  # Remove test adapters
  for HOA in "${HOAS[@]}"
  do
    vboxmanage hostonlyif remove $HOA || true
  done

}
