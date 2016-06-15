#!/usr/bin/env bats

# Dont allow us to continue without docker-machine in the path
: ${DOCKER_MACHINE:=$(which docker-machine)}
if [ ! -f "${DOCKER_MACHINE}" ]; then
  echo "Docker Machine is not installed. Please install it in your PATH before continuing"
  exit 1
fi

# Dont allow us to continue without vboxmanage in the path
: ${VBOX:=$(which vboxmanage)}
if [ ! -f "${VBOX}" ]; then
  echo "VBoxManage is not installed. Please install it in your PATH before continuing"
  exit 1
fi

#
# Env helpers
#

# Set a default name for the kalabox installer
: ${KBOX_INSTALLER:=kbox-installer}

# Path to the uninstall script
: ${KBOX_UNINSTALL:=$(pwd)/osx/uninstall.sh}

#
# Get the "last" VBOX host only adapter
# @todo: are their circumstances where VB will have no HOA?
#
: ${KBOX_LAST_HOA:=$(vboxmanage list hostonlyifs | grep "Name:            vboxnet" | tail -1 | cut -d: -f2 | tr -d ' ')}

#
# Print helpful debug information
# Use the below line to get this to show up in your tests
#
#   export KBOX_INSTALLER_DEBUG=true
#
if [ $KBOX_INSTALLER_DEBUG ]; then
  echo "Machine binary       :   $DOCKER_MACHINE" >&2
  echo "VBoxManage binary    :   $VBOX" >&2
  echo "Installer VM name    :   $KBOX_INSTALLER" >&2
  echo "Uninstall script     :   $KBOX_UNINSTALL" >&2
  echo "VirtualBox Last HOA  :   $KBOX_LAST_HOA" >&2
fi
