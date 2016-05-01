#!/usr/bin/env bats


#
# Env helpers
#

# The kalabox IP address
: ${KALABOX_IP:=10.13.37.100}

# Dont allow us to continue without a docker daemon running
: ${KBOX_NEEDS_DAEMON:=$("$DOCKER" info > /dev/null && echo 0 || echo $?)}
if [ $KBOX_NEEDS_DAEMON != 0 ]; then
  echo "The docker daemon is not running. Please start it before continuing."
  echo "see: https://docs.docker.com/linux/step_one/"
  exit 1
fi

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

# Debian settings
if [ "${FLAVOR}" == "debian" ]; then

  # Get some build envvars
  source linux/scripts/env.sh deb

  # Dep handling
  : ${LINUX_DEP_INSTALL:=apt-get -y --force-yes install}
  : ${LINUX_DEP_REMOVE:=apt-get -y --purge remove}

  # Pkg handling
  : ${LINUX_PKG_INSTALL:=dpkg -i}
  : ${LINUX_PKG_REMOVE:=dpkg -r}

  # Pkg name
  : ${KALABOX_PKG:=kalabox.deb}

# Redora settings
# @todo: Verify the below
elif [ "${FLAVOR}" == "fedora" ]; then

  # Get some build envvars
  source linux/scripts/env.sh rpm

  # Dep handling
  : ${LINUX_DEP_INSTALL:=dnf -y install}
  : ${LINUX_DEP_REMOVE:=dnf -y remove}

  # Pkg handling
  : ${LINUX_PKG_INSTALL:=rpm -ivh}
  : ${LINUX_PKG_REMOVE:=rpm -ev}

  # Pkg name
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
  echo "Linux dep install cmd :   $LINUX_DEP_INSTALL" >&2
  echo "Linux dep remove cmd  :   $LINUX_DEP_REMOVE" >&2
  echo "Linux pkg install cmd :   $LINUX_PKG_INSTALL" >&2
  echo "Linux pkg remove cmd  :   $LINUX_PKG_REMOVE" >&2
  echo "Kalabox pkg           :   $KALABOX_PKG" >&2
fi
