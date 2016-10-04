#!/bin/bash
set -e

# Set defaults
: ${KALABOX_UID:='1000'}
: ${KALABOX_GID:='50'}
: ${KALABOX_SSH_KEY:='id.rsa'}

# Add local user to match host
addgroup "$KALABOX_GID" || true
adduser -D -h "/config" -G "$KALABOX_GID" "$KALABOX_UID"

# Move any config over and git correct perms
export HOME=/config
chown -Rf $KALABOX_UID:$KALABOX_UID /config

# Check for an SSH key and move it into the correct position
# We need to do this because VB SHARING ON WINDOZE will forward in
# the ssh key as 777 ... yeah ... FACEPALM
if [ -f "/user/.ssh/$KALABOX_SSH_KEY" ]; then
  mkdir -p $HOME/.ssh
  chmod 700 $HOME/.ssh
  cp -f /user/.ssh/$KALABOX_SSH_KEY $HOME/.ssh/$KALABOX_SSH_KEY
  chmod 600 $HOME/.ssh/$KALABOX_SSH_KEY
  chown -Rf $KALABOX_UID:$KALABOX_UID $HOME/.ssh
fi

# Run the command
echo "$KALABOX_UID ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers
su -m "$KALABOX_UID" -s "/bin/bash" -c "$(echo $@)"
