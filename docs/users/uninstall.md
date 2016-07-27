Uninstallation
==============

Preuninstall Checks
-------------------

1. Make sure you have closed the Kalabox GUI and terminated any running Kalabox process

Mac OSX
-------

1. Run `kbox version` to determine the Kalabox version you have
2. Visit [the Kalabox release page](https://github.com/kalabox/kalabox/releases) and download the DMG that correspondes to your version
3. Mount the DMG you downloaded
4. Run `sudo /Volumes/Kalabox/uninstall.sh`
5. Agree to remove the Kalabox2 VM when prompted
6. If you think uninstall failed please consult the [manual uninstall steps below](#manually-uninstalling-kalabox)

Windows
-------

1. Open "Programs and Features" or "Add/Remove Programs"
2. Find and select Kalabox in the list
3. Click on "Uninstall"
4. If you think uninstall failed please consult the [manual uninstall steps below](#manually-uninstalling-kalabox)

Linux
-----

1. Open up the "Software Center"
2. Search for and select "kalabox"
3. Click on "Uninstall"
4. Enter your password if prompted
5. If you think uninstall failed please consult the [manual uninstall steps below](#manually-uninstalling-kalabox)

If you do not have the GUI-based Software Center you can also uninstall Kalabox on the command line.

```bash
# With apt
sudo apt-get remove kalabox

# With dpkg
sudo dpkg -P kalabox

# With dnf
sudo dnf remove kalabox
```

Manually Uninstalling Kalabox
-----------------------------

There are still some bugs with our native uninstallers. If you feel like your Kalabox uninstallation has not completed successfully please review the following things have been removed and then try the uninstaller again.

### Kalabox engine has been removed successfully on OSX/Windows

1. Open up VirtualBox and manually remove the Kalabox2 VM, including all its files if it shows up.
2. Remove `~/.docker/machine/machines/Kalabox2/` if it exists

!!! note "What does ~ mean?"
    `~` is your home folder. This should be `C:\Users\USERNAME` on Windows

### Kalabox service is not running on Linux

`sudo kbox service stop` should stop the service on Linux but if it doesn't you should manually kill the process.

```bash
# List running processes that contain docker
ps aux | grep 10.13.37.100

# User the PID number from above
sudo kill PID
```

### Remove Kalabox directories on Linux/OSX

```bash
# Linux
sudo service kalabox stop
sudo rm -rf /usr/share/kalabox
sudo rm -f /etc/resolver/kbox

# OSX
sudo rm -rf /Applications/Kalabox.app
sudo rm -f /etc/resolver/kbox
```
