#!/bin/bash

# Uninstall Script

if [ "${USER}" != "root" ]; then
  echo "$0 must be run as root!"
  exit 2
fi

# Find out our user
CONSOLE_USER=$(stat -f '%Su' /dev/console)
CONSOLE_USER_HOME=$(su $CONSOLE_USER -c 'echo $HOME')

while true; do
  read -p "Remove all Kalabox2 Docker Machine VMs? (Y/N): " yn
  case $yn in
    [Yy]* ) sudo -u "${CONSOLE_USER}" "${CONSOLE_USER_HOME}/.kalabox/bin/docker-machine" rm -f Kalabox2; break;;
    [Nn]* ) break;;
    * ) echo "Please answer yes or no."; exit 1;;
  esac
done

echo "Removing Applications..."
rm -rf /Applications/Kalabox.app

echo "Removing docker binaries..."
rm -f "${CONSOLE_USER_HOME}"/.kalabox/bin/docker-machine
rm -r "${CONSOLE_USER_HOME}"/.kalabox/bin/docker-machine-driver*
rm -f "${CONSOLE_USER_HOME}"/.kalabox/bin/docker-compose
rm -rf "${CONSOLE_USER_HOME}"/.docker/machine/machines/Kalabox2

echo "Removing kalabox binaries..."
rm -f /usr/local/bin/kbox

echo "Removing syncthing binaries and files..."
rm -f "${CONSOLE_USER_HOME}"/.kalabox/bin/syncthing
rm -rf "${CONSOLE_USER_HOME}"/.kalabox/syncthing

echo "Removing services files..."
rm -rf "${CONSOLE_USER_HOME}"/.kalabox/services

echo "Removing boot2docker.iso"
rm -rf /usr/local/share/boot2docker

echo "Removing DNS"
rm -f /etc/resolver/kbox

echo "Removing provisioned flag"
rm -f "${CONSOLE_USER_HOME}"/.kalabox/provisioned

echo "Removing other Kalabox2 files"
rm -rf "${CONSOLE_USER_HOME}"/.kalabox

echo "All Done!"
