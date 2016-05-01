#!/bin/bash

# Set up our FPM env
# We want this separate so we can source from other things ie tests

# Set some basic info
PKG_NAME="kalabox"
PKG_PKG="/kalabox.$PKG_TYPE"
PKG_DESCRIPTION="The fastest and easiest local dev with docker."
PKG_MAINTAINER="Mike Pirog <mike@kalabox.io>"
PKG_URL="https://www.kalabox.io/"
PKG_LICENSE="MIT"
PKG_EXTRA_OPTS="--force"

# Set scripts
PKG_SCRIPTS="\
--after-install /$PKG_TYPE/postinst \
--before-install /$PKG_TYPE/preinst \
--after-remove /$PKG_TYPE/postrm \
--before-remove /$PKG_TYPE/prerm"

# Set our dependencies
DEPS=( bridge-utils iptables )

# Add OS specific deps
if [ "$1" == "rpm" ]; then
  DEPS+=('libcgroup')
elif [ "$1" == "deb" ]; then
  DEPS+=('cgroup-lite')
fi

# Loop through to build our PKG_DEPS
for i in "${DEPS[@]}"
do
  PKG_DEPS="$PKG_DEPS --depends $i"
done
