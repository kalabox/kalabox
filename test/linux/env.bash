#!/usr/bin/env bats


#
# Env helpers
#

#
# Gather information about the system and state
#
# Let's first try to get our system
if [ -f /etc/os-release ]; then
  source /etc/os-release
  : ${FLAVOR:=$ID_LIKE}
  : ${FLAVOR:=$ID}
# Some OS do not implement /etc/os-release yet so lets do this in case
# they dont
elif [ -f /etc/arch-release ]; then
  FLAVOR="arch"
elif [ -f /etc/gentoo-release ]; then
  FLAVOR="gentoo"
elif [ -f /etc/fedora-release ]; then
  FLAVOR="fedora"
elif [ -f /etc/redhat-release ]; then
  FLAVOR="redhat"
elif [ -f /etc/debian_version ]; then
  FLAVOR="debian"
else
  FLAVOR="whoknows"
fi

#
# Define flavor specific things
#
if [ "${FLAVOR}" == "debian" ]; then
  : ${LINUX_PKG_INSTALL:=apt-get -y --force-yes install}
  : ${LINUX_PKG_REMOVE:=dnf -y install}
  : ${KALABOX_PKG:=kalabox.deb}
elif [ "${FLAVOR}" == "fedora" ]; then
  : ${LINUX_PKG_INSTALL:=dnf -y install}
  : ${LINUX_PKG_REMOVE:=apt-get -y --force-yes install}
  : ${KALABOX_PKG:=kalabox.rpm}
fi

#
# Print helpful debug information
# Use the below line to get this to show up in your tests
#
#   export KBOX_INSTALLER_DEBUG=true
#
if [ $KBOX_INSTALLER_DEBUG ]; then
  echo "Linux flavor          :   $FLAVOR" >&2
  echo "Linux pkg install cmd :   $LINUX_PKG_INSTALL" >&2
  echo "Linux pkg remove cmd  :   $LINUX_PKG_REMOVE" >&2
fi
