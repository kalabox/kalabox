#!/bin/bash

# Get the script type
SCRIPT_TYPE=$1
DNS_SCRIPTS_DIR=/install/dns/$2/control
KALABOX_SCRIPTS_DIR=/install/scripts

# Build scripts
mkdir -p /$2
echo '#!/bin/bash' > "/$2/$SCRIPT_TYPE"
echo '' >> "/$2/$SCRIPT_TYPE"
chmod +x "/$2/$SCRIPT_TYPE"

# Check for kbox script
if [ -f "${KALABOX_SCRIPTS_DIR}/${SCRIPT_TYPE}" ]; then
  echo
  cat "${KALABOX_SCRIPTS_DIR}/${SCRIPT_TYPE}" >> "/$2/$SCRIPT_TYPE"
fi

# Check for DNS script
if [ -f "${DNS_SCRIPTS_DIR}/${SCRIPT_TYPE}" ]; then
  cat "${DNS_SCRIPTS_DIR}/${SCRIPT_TYPE}" >> "/$2/$SCRIPT_TYPE"
fi
