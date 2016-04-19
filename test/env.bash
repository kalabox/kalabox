#!/usr/bin/env bats

#
# Local Dev Helpers
#
# Some things we need for this to work locally
#
#

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

# Dont allow us to continue without docker-machine in the path
: ${DOCKER_MACHINE:=$(which docker-machine)}
if [ ! -f "${DOCKER_MACHINE}" ]; then
  echo "Docker Machine is not installed. Please install it in your PATH before continuing"
  exit 1
fi

# Dont allow us to continue without docker in the path
: ${DOCKER:=$(which docker)}
if [ ! -f "${DOCKER}" ]; then
  echo "Docker is not installed. Please install it in your PATH before continuing"
  exit 1
fi

# Dont allow us to continue without vboxmanage in the path
: ${VBOX:=$(which vboxmanage)}
if [ ! -f "${VBOX}" ]; then
  echo "VBoxManage is not installed. Please install it in your PATH before continuing"
  exit 1
fi

# Set a default name for the kalabox installer
: ${KBOX_INSTALLER:=kbox-installer}

# Path to the uninstall script
: ${KBOX_UNINSTALL:=$(pwd)/osx/uninstall.sh}

#
# Print helpful debug information
# Use the below line to get this to show up in your tests
#
#   export KBOX_INSTALLER_DEBUG=true
#
if [ $KBOX_INSTALLER_DEBUG ]; then
  echo "Docker binary        :   $DOCKER"
  echo "Machine binary       :   $DOCKER_MACHINE"
  echo "VBoxManage binary    :   $VBOX"
  echo "Installer VM name    :   $KBOX_INSTALLER"
  echo "Uninstall script     :   $KBOX_UNINSTALL"
fi
