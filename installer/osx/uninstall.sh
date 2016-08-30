#!/bin/bash

set -e

# Uninstall Script
# -# Get our options
FORCE=false
while getopts 'f' flag; do
  case "${flag}" in
    f) FORCE='true' ;;
  esac
done

# Set some helpers
APPLICATION="/Applications/Kalabox.app/Contents/MacOS"
DOCKER_MACHINE="$APPLICATION/bin/docker-machine"

#
# Uninstall function
#
uninstall() {

  echo "Removing Kalabox VM..."
  "${DOCKER_MACHINE}" rm -f Kalabox2
  rm -f "${HOME}/.docker/machine/machines/Kalabox2"

  echo "Removing Application..."
  sudo rm -rf /Applications/Kalabox.app

  echo "Removing DNS"
  sudo rm -f /etc/resolver/kbox

  echo "All Done!"

}

# Primary logic
while true; do
  if [ $FORCE == false ]; then
    read -p "Completely remove Kalabox? (Y/N): " yn
  else
    yn=y
  fi
  case $yn in
    [Yy]* ) uninstall; break;;
    [Nn]* ) break;;
    * ) echo "Please answer yes or no."; exit 1;;
  esac
done

