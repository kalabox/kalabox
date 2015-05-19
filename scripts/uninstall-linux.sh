#!/bin/bash
#
# Kalabox Uninstaller Script.
#
# Copyright (C) 2015 Kalamuna LLC
#
# This file also contains a modified VirtualBox uninstallers.
#
#

# Override any funny stuff from the user.
export PATH="/bin:/usr/bin:/sbin:/usr/sbin:$PATH"
source /etc/os-release

## @param [Integer] $1 exit code.
key_exit() {
    echo "Press enter to exit."
    read
    exit $1
}

# Appends a value to an array.
#
# @param [String] $1 Name of the variable to modify
# @param [String] $2 Value to append
append() {
    eval $1[\${#$1[*]}]=$2
}

##
# Display some important knowledge first
#
echo ""
echo "Welcome to the Kalabox uninstaller script."
echo ""
echo "This script will destroy your current Kalabox build. If you want"
echo "to save your current build for later please either vagrant package"
echo "your existing build or export the relevant VirtualBox appliance."
echo ""
echo "MAKE SURE THAT YOU'VE EXITED THE KALABOX APP OR THIS WILL BLOW UP!!!"
echo "ALSO MAKE SURE YOU VISIT 127.0.0.1:60008 AND SHUTDOWN SYNCTHING"
echo ""
echo "WHAT YOU WANT TO DO?"
echo ""
echo "1. Remove all the things."
echo "2. Forget this ever happened."
echo ""
read my_answer
if [ "$my_answer" == "2" ]; then
    echo "This never happened."
    key_exit 2
fi

#!/usr/bin/env bash
if ([ "$my_answer" == "1" ]); then
    # Initiate the actual uninstall, which requires admin privileges.
    echo "The uninstallation process requires administrative privileges"
    echo "because some of the installed files cannot be removed by a"
    echo "normal user. You may now be prompted for a password..."

    # Just start the sudo party
    /usr/bin/sudo -p "Please enter %u's password:" echo "Let's get it started"

    # Gather some data on the things
    B2D=$(which boot2docker)
    VBOX=$(which VBoxManage)
    BOOT2DOCKER_PROFILE=$HOME/.kalabox/.provider/profile
    kala_files=()
    append kala_files "$HOME/.kalabox/.provider"
    append kala_files "$HOME/.kalabox/.provisioned"
    append kala_files "$HOME/VirtualBox\ VMs/Kalabox2"
    append kala_files "$B2D"
    append kala_files "$BOOT2DOCKER_PROFILE"
    append kala_files "$HOME/.kalabox/syncthing"
    append kala_files "$HOME/.kalabox/bin/syncthing"
    append kala_files "$HOME/.kalabox/appRegistry.json"

    # Print the files and directories that are to be removed and verify
    # with the user that that is what he/she really wants to do.
    echo "The following files and directories will be removed:"
    for file in "${kala_files[@]}"; do
        echo "    $file"
    done

    if [ "$B2D" ]; then
        if [ "$VBOX" ]; then
            export BOOT2DOCKER_PROFILE=$HOME/.kalabox/.provider/profile
            $B2D poweroff
            $B2D destroy
        fi
        sleep 10s
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $HOME/.kalabox/.provider
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $HOME/.kalabox/provisioned
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $HOME/VirtualBox\ VMs/Kalabox2
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $B2D
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $BOOT2DOCKER_PROFILE
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $HOME/.kalabox/syncthing
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $HOME/.kalabox/bin/syncthing
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $HOME/.kalabox/appRegistry.json
        /usr/bin/sudo /bin/sed -i '/nameserver 10.13.37/d' /etc/resolvconf/resolv.conf.d/head
        /usr/bin/sudo /sbin/resolvconf -u
    fi

    #!/bin/sh
    #
    # VirtualBox Uninstaller Script.
    #
    # Copyright (C) 2007-2010 Oracle Corporation
    #
    # This file is part of VirtualBox Open Source Edition (OSE), as
    # available from http://www.virtualbox.org. This file is free software;
    # you can redistribute it and/or modify it under the terms of the GNU
    # General Public License (GPL) as published by the Free Software
    # Foundation, in version 2 as it comes in the "COPYING" file of the
    # VirtualBox OSE distribution. VirtualBox OSE is distributed in the
    # hope that it will be useful, but WITHOUT ANY WARRANTY of any kind.
    #

    #
    # Display a simple welcome message first.
    #
    echo ""
    echo "Preparing to uninstall VirtualBox"
    echo ""

    if test "$my_default_prompt" != "Yes"; then
        echo "Do you wish to uninstall VirtualBox (Yes/No)?"
        read my_answer
        # Display the sudo usage instructions and execute the command.
        #
        echo "The uninstallation processes requires administrative privileges"
        echo "because some of the installed files cannot be removed by a normal"
        echo "user. You may be prompted for your password now..."
        echo ""
        if test "$my_answer" != "Yes"  -a  "$my_answer" != "YES"  -a  "$my_answer" != "yes"; then
            echo "Aborting uninstall. (answer: '$my_answer')".
            exit 2;
        fi
        echo ""
        if ([ "$ID" == "debian" ] || [ "$ID_LIKE" == "debian" ] ); then
            /usr/bin/sudo -p "Please enter %u's password:" dpkg -P virtualbox-4.3
        else
            /usr/bin/sudo -p "Please enter %u's password:" rpm -e virtualbox-4.3
        fi
    fi

fi

echo "Done."
key_exit 0;
