#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}

# Add local user to match host
addgroup "$KALABOX_GID" || true
adduser -D -h "/config" -G "$KALABOX_GID" "$KALABOX_UID"

# Move any config over and git correct perms
export HOME=/config
chown -Rf $KALABOX_UID:$KALABOX_UID /config

# Run the command
echo "$KALABOX_UID ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
su -m "$KALABOX_UID" -s "/bin/bash" -c "$(echo $@)"
