#!/bin/bash

# Get the script type
SCRIPT_TYPE=$1
DNS_SCRIPTS_DIR=build/installer/dns/$2/control
KALABOX_SCRIPTS_DIR=build/installer/scripts
PKG_SCRIPTS_DIR=build/installer/pkg/scripts

# Build scripts
mkdir -p "$PKG_SCRIPTS_DIR/$2"
echo '#!/bin/bash' > "$PKG_SCRIPTS_DIR/$2/$SCRIPT_TYPE"
echo '' >> "$PKG_SCRIPTS_DIR/$2/$SCRIPT_TYPE"
chmod +x "$PKG_SCRIPTS_DIR/$2/$SCRIPT_TYPE"

# Check for DNS script
if [ -f "${DNS_SCRIPTS_DIR}/${SCRIPT_TYPE}" ]; then
  echo '' >> "$PKG_SCRIPTS_DIR/$2/$SCRIPT_TYPE"
  cat "${DNS_SCRIPTS_DIR}/${SCRIPT_TYPE}" >> "$PKG_SCRIPTS_DIR/$2/$SCRIPT_TYPE"
fi

# Check for kbox script
if [ -f "${KALABOX_SCRIPTS_DIR}/${SCRIPT_TYPE}" ]; then
  echo '' >> "$PKG_SCRIPTS_DIR/$2/$SCRIPT_TYPE"
  cat "${KALABOX_SCRIPTS_DIR}/${SCRIPT_TYPE}" >> "$PKG_SCRIPTS_DIR/$2/$SCRIPT_TYPE"
fi
