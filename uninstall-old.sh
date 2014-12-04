#!/bin/sh
#
# Kalabox Uninstaller Script.
#
# Copyright (C) 2014 Kalamuna LLC
#
# This file also contains a modified VirtualBox uninstallers.
#
#

# Override any funny stuff from the user.
export PATH="/bin:/usr/bin:/sbin:/usr/sbin:$PATH"

## @param [Integer] $1 exit code.
function key_exit() {
    echo "Press enter to exit."
    read
    exit $1
}

# Appends a value to an array.
#
# @param [String] $1 Name of the variable to modify
# @param [String] $2 Value to append
function append() {
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
if [ "$my_answer" == "1" ]; then
    # Initiate the actual uninstall, which requires admin privileges.
    echo "The uninstallation process requires administrative privileges"
    echo "because some of the installed files cannot be removed by a"
    echo "normal user. You may now be prompted for a password..."

    # Just start the sudo party
    /usr/bin/sudo -p "Please enter %u's password:" echo "Let's get it started"

    # Gather some data on the things
    B2D=$(which boot2docker)
    DOCKER=$(which docker)
    VBOX=$(which VBoxManage)
    kala_files=()
    append kala_files "/Applications/boot2docker.app"
    append kala_files "~/.boot2docker"
    append kala_files "$B2D"
    append kala_files "$DOCKER"
    append kala_files "/usr/local/share/boot2docker"
    # Print the files and directories that are to be removed and verify
    # with the user that that is what he/she really wants to do.
    echo "The following files and directories will be removed:"
    for file in "${kala_files[@]}"; do
        echo "    $file"
    done

    if [ "$B2D" ]; then
        if [ "$VBOX" ]; then
            $B2D poweroff
            $B2D destroy
        fi
        sleep 10s
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -f $B2D
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf $HOME/.boot2docker
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -rf /usr/local/share/boot2docker
    fi

    if [ "$DOCKER" ]; then
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -f $DOCKER
    fi

    # Delete the B2D application
    /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -Rf /Applications/boot2docker.app

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

    #
    # Collect directories and files to remove.
    # Note: Do NOT attempt adding directories or filenames with spaces!
    #
    declare -a my_directories
    declare -a my_files

    # Users files first
    test -f "${HOME}/Library/LaunchAgents/org.virtualbox.vboxwebsrv.plist"  && my_files+=("${HOME}/Library/LaunchAgents/org.virtualbox.vboxwebsrv.plist")

    test -d /Library/StartupItems/VirtualBox/          && my_directories+=("/Library/StartupItems/VirtualBox/")
    test -d /Library/Receipts/VBoxStartupItems.pkg/    && my_directories+=("/Library/Receipts/VBoxStartupItems.pkg/")

    test -d "/Library/Application Support/VirtualBox/LaunchDaemons/"    && my_directories+=("/Library/Application Support/VirtualBox/LaunchDaemons/")
    test -d "/Library/Application Support/VirtualBox/VBoxDrv.kext/"     && my_directories+=("/Library/Application Support/VirtualBox/VBoxDrv.kext/")
    test -d "/Library/Application Support/VirtualBox/VBoxUSB.kext/"     && my_directories+=("/Library/Application Support/VirtualBox/VBoxUSB.kext/")
    test -d "/Library/Application Support/VirtualBox/VBoxNetFlt.kext/"  && my_directories+=("/Library/Application Support/VirtualBox/VBoxNetFlt.kext/")
    test -d "/Library/Application Support/VirtualBox/VBoxNetAdp.kext/"  && my_directories+=("/Library/Application Support/VirtualBox/VBoxNetAdp.kext/")
    # Pre 4.3.0rc1 locations:
    test -d /Library/Extensions/VBoxDrv.kext/          && my_directories+=("/Library/Extensions/VBoxDrv.kext/")
    test -d /Library/Extensions/VBoxUSB.kext/          && my_directories+=("/Library/Extensions/VBoxUSB.kext/")
    test -d /Library/Extensions/VBoxNetFlt.kext/       && my_directories+=("/Library/Extensions/VBoxNetFlt.kext/")
    test -d /Library/Extensions/VBoxNetAdp.kext/       && my_directories+=("/Library/Extensions/VBoxNetAdp.kext/")
    # Tiger support is obsolete, but we leave it here for a clean removing of older
    # VirtualBox versions
    test -d /Library/Extensions/VBoxDrvTiger.kext/     && my_directories+=("/Library/Extensions/VBoxDrvTiger.kext/")
    test -d /Library/Extensions/VBoxUSBTiger.kext/     && my_directories+=("/Library/Extensions/VBoxUSBTiger.kext/")
    test -d /Library/Receipts/VBoxKEXTs.pkg/           && my_directories+=("/Library/Receipts/VBoxKEXTs.pkg/")

    test -f /usr/bin/VirtualBox                        && my_files+=("/usr/bin/VirtualBox")
    test -f /usr/bin/VBoxManage                        && my_files+=("/usr/bin/VBoxManage")
    test -f /usr/bin/VBoxVRDP                          && my_files+=("/usr/bin/VBoxVRDP")
    test -f /usr/bin/VBoxHeadless                      && my_files+=("/usr/bin/VBoxHeadless")
    test -f /usr/bin/vboxwebsrv                        && my_files+=("/usr/bin/vboxwebsrv")
    test -f /usr/bin/VBoxBalloonCtrl                   && my_files+=("/usr/bin/VBoxBalloonCtrl")
    test -f /usr/bin/VBoxAutostart                     && my_files+=("/usr/bin/VBoxAutostart")
    test -f /usr/bin/vbox-img                          && my_files+=("/usr/bin/vbox-img")
    test -d /Library/Receipts/VirtualBoxCLI.pkg/       && my_directories+=("/Library/Receipts/VirtualBoxCLI.pkg/")
    test -f /Library/LaunchDaemons/org.virtualbox.startup.plist && my_files+=("/Library/LaunchDaemons/org.virtualbox.startup.plist")

    test -d /Applications/VirtualBox.app/              && my_directories+=("/Applications/VirtualBox.app/")
    test -d /Library/Receipts/VirtualBox.pkg/          && my_directories+=("/Library/Receipts/VirtualBox.pkg/")

    # legacy
    test -d /Library/Receipts/VBoxDrv.pkg/             && my_directories+=("/Library/Receipts/VBoxDrv.pkg/")
    test -d /Library/Receipts/VBoxUSB.pkg/             && my_directories+=("/Library/Receipts/VBoxUSB.pkg/")

    # python stuff
    python_versions="2.3 2.5 2.6 2.7"
    for p in $python_versions; do
        test -f /Library/Python/$p/site-packages/vboxapi/VirtualBox_constants.py  && my_files+=("/Library/Python/$p/site-packages/vboxapi/VirtualBox_constants.py")
        test -f /Library/Python/$p/site-packages/vboxapi/VirtualBox_constants.pyc && my_files+=("/Library/Python/$p/site-packages/vboxapi/VirtualBox_constants.pyc")
        test -f /Library/Python/$p/site-packages/vboxapi/__init__.py              && my_files+=("/Library/Python/$p/site-packages/vboxapi/__init__.py")
        test -f /Library/Python/$p/site-packages/vboxapi/__init__.pyc             && my_files+=("/Library/Python/$p/site-packages/vboxapi/__init__.pyc")
        test -f /Library/Python/$p/site-packages/vboxapi-1.0-py$p.egg-info        && my_files+=("/Library/Python/$p/site-packages/vboxapi-1.0-py$p.egg-info")
        test -d /Library/Python/$p/site-packages/vboxapi/                         && my_directories+=("/Library/Python/$p/site-packages/vboxapi/")
    done

    #
    # Collect KEXTs to remove.
    # Note that the unload order is significant.
    #
    declare -a my_kexts
    for kext in org.virtualbox.kext.VBoxUSB org.virtualbox.kext.VBoxNetFlt org.virtualbox.kext.VBoxNetAdp org.virtualbox.kext.VBoxDrv; do
        if /usr/sbin/kextstat -b $kext -l | grep -q $kext; then
            my_kexts+=("$kext")
        fi
    done

    #
    # Collect packages to forget
    #
    my_pb='org\.virtualbox\.pkg\.'
    my_pkgs=`/usr/sbin/pkgutil --pkgs="${my_pb}vboxkexts|${my_pb}vboxstartupitems|${my_pb}virtualbox|${my_pb}virtualboxcli"`

    #
    # Did we find anything to uninstall?
    #
    if test -z "${my_directories[*]}"  -a  -z "${my_files[*]}"   -a  -z "${my_kexts[*]}"  -a  -z "$my_pkgs"; then
        echo "No VirtualBox files, directories, KEXTs or packages to uninstall."
        echo "Done."
        exit 0;
    fi

    #
    # Look for running VirtualBox processes and warn the user
    # if something is running. Since deleting the files of
    # running processes isn't fatal as such, we will leave it
    # to the user to choose whether to continue or not.
    #
    # Note! comm isn't supported on Tiger, so we make -c to do the stripping.
    #
    my_processes="`ps -axco 'pid uid command' | grep -wEe '(VirtualBox|VirtualBoxVM|VBoxManage|VBoxHeadless|vboxwebsrv|VBoxXPCOMIPCD|VBoxSVC|VBoxNetDHCP|VBoxNetNAT)' | grep -vw grep | grep -vw VirtualBox_Uninstall.tool | tr '\n' '\a'`";
    if test -n "$my_processes"; then
        echo 'Warning! Found the following active VirtualBox processes:'
        echo "$my_processes" | tr '\a' '\n'
        echo ""
        echo "We recommend that you quit all VirtualBox processes before"
        echo "uninstalling the product."
        echo ""
        if test "$my_default_prompt" != "Yes"; then
            echo "Do you wish to continue none the less (Yes/No)?"
            read my_answer
            if test "$my_answer" != "Yes"  -a  "$my_answer" != "YES"  -a  "$my_answer" != "yes"; then
                echo "Aborting uninstall. (answer: '$my_answer')".
                exit 2;
            fi
            echo ""
            my_answer=""
        fi
    fi

    #
    # Display the files and directories that will be removed
    # and get the user's consent before continuing.
    #
    if test -n "${my_files[*]}"  -o  -n "${my_directories[*]}"; then
        echo "The following files and directories (bundles) will be removed:"
        for file in "${my_files[@]}";       do echo "    $file"; done
        for dir  in "${my_directories[@]}"; do echo "    $dir"; done
        echo ""
    fi
    if test -n "${my_kexts[*]}"; then
        echo "And the following KEXTs will be unloaded:"
        for kext in "${my_kexts[@]}";       do echo "    $kext"; done
        echo ""
    fi
    if test -n "$my_pkgs"; then
        echo "And the traces of following packages will be removed:"
        for kext in $my_pkgs;       do echo "    $kext"; done
        echo ""
    fi

    if test "$my_default_prompt" != "Yes"; then
        echo "Do you wish to uninstall VirtualBox (Yes/No)?"
        read my_answer
        if test "$my_answer" != "Yes"  -a  "$my_answer" != "YES"  -a  "$my_answer" != "yes"; then
            echo "Aborting uninstall. (answer: '$my_answer')".
            exit 2;
        fi
        echo ""
    fi

    #
    # Unregister has to be done before the files are removed.
    #
    LSREGISTER=/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister
    if [ -e ${LSREGISTER} ]; then
        ${LSREGISTER} -u /Applications/VirtualBox.app > /dev/null
        ${LSREGISTER} -u /Applications/VirtualBox.app/Contents/Resources/vmstarter.app > /dev/null
    fi

    #
    # Display the sudo usage instructions and execute the command.
    #
    echo "The uninstallation processes requires administrative privileges"
    echo "because some of the installed files cannot be removed by a normal"
    echo "user. You may be prompted for your password now..."
    echo ""

    if test -n "${my_files[*]}"  -o  -n "${my_directories[*]}"; then
        /usr/bin/sudo -p "Please enter %u's password:" /bin/rm -Rf "${my_files[@]}" "${my_directories[@]}"
        my_rc=$?
        if test "$my_rc" -ne 0; then
            echo "An error occurred durning 'sudo rm', there should be a message above. (rc=$my_rc)"
            test -x /usr/bin/sudo || echo "warning: Cannot find /usr/bin/sudo or it's not an executable."
            test -x /bin/rm       || echo "warning: Cannot find /bin/rm or it's not an executable"
            echo ""
            echo "The uninstall failed. Please retry."
            exit 1;
        fi
    fi

    my_rc=0
    for kext in "${my_kexts[@]}"; do
        echo unloading $kext
        /usr/bin/sudo -p "Please enter %u's password (unloading $kext):" /sbin/kextunload -m $kext
        my_rc2=$?
        if test "$my_rc2" -ne 0; then
            echo "An error occurred durning 'sudo /sbin/kextunload -m $kext', there should be a message above. (rc=$my_rc2)"
            test -x /usr/bin/sudo    || echo "warning: Cannot find /usr/bin/sudo or it's not an executable."
            test -x /sbin/kextunload || echo "warning: Cannot find /sbin/kextunload or it's not an executable"
            my_rc=$my_rc2
        fi
    done
    if test "$my_rc" -eq 0; then
        echo "Successfully unloaded VirtualBox kernel extensions."
    else
        echo "Failed to unload one or more KEXTs, please reboot the machine to complete the uninstall."
        exit 1;
    fi

    # Cleaning up pkgutil database
    for my_pkg in $my_pkgs; do
        /usr/bin/sudo -p "Please enter %u's password (removing $my_pkg):" /usr/sbin/pkgutil --forget "$my_pkg"
    done
fi

echo "Done."
key_exit 0;
