#!/usr/bin/env bats

#
# Sudo helpers
#
# You will want to set this so it matches your environment
#
#   export KBOX_SUDO_PASSWORD=MYPASSWORD
#
: ${KBOX_SUDO_PASSWORD=kalabox}

#
# Env helpers
#

# Dont allow us to continue without docker in the path
: ${DOCKER:=$(which docker)}
if [ ! -f "${DOCKER}" ]; then
  echo "Docker is not installed. Please install it in your PATH before continuing"
  exit 1
fi

#
# Print helpful debug information
# Use the below line to get this to show up in your tests
#
#   export KBOX_INSTALLER_DEBUG=true
#
if [ $KBOX_INSTALLER_DEBUG ]; then
  echo "Docker binary        :   $DOCKER" >&2
fi
