Installation
============

Preinstall Checks
-----------------

1. If you have previously installed Kalabox and are attempting to install a new minor version (ie from 0.12.x to 0.13.x) it is **highly recommended** that you [uninstall](http://docs.kalabox.io/users/uninstall/) your current version of Kalabox before continuing
2. Verify that your system meets the [minimum system and hardware requirements](http://docs.kalabox.io/general/sysreq/) to run Kalabox
3. Verify that you are connected to the internet
4. Verify that you have administrative access to your machine

Mac OSX
-------

### Installation Steps

1. Download the `.dmg` package from [kalabox.io/download](http://kalabox.io/download)
2. Mount the DMG by double-clicking it
3. Double-click on the `KalaboxInstaller.pkg`
4. Enter your username and password.

Windows
-------

!!! note "Install in default location"
    It is currently recommended to install Kalabox in the default location of `C:\Program Files` if possible.

### Installation Steps

1. Download the Windows `.exe` package from [kalabox.io/download](http://kalabox.io/download)
2. Double click on the download `kalabox.exe`
3. Approve various UAC prompts during install

!!! tip "White list *.kbox domains"
    White list *.kbox domains in relevant security software that may be interfering with our custom DNS. See this [github issue](https://github.com/kalabox/kalabox/issues/891) for more information on the topic.

Debian/Ubuntu
-------------

### Installation

1. Download the `.deb` package from [kalabox.io/download](http://kalabox.io/download)
2. Double click on the `.deb` package to launch Software Center
3. Click the Install button and enter your password when prompted

!!! Note "Kalabox binds to port 80"
    Kalabox uses port 80 on your machine, so make sure it is free before you attempt an install.

If you do not have a GUI based Software Center you can install the `.deb` pkg on the command line.

```bash
sudo apt-get update -y
sudo apt-get install bridge-utils iptables cgroup-bin
sudo dpkg -i kalabox.deb
```

Fedora/RedHat
-------------

### Installation

1. Download the `.rpm` package from [kalabox.io/download](http://kalabox.io/download)
2. Double click on the `.rpm` package to launch Software Center
3. Click the Install button and enter your password when prompted

!!! Note "Kalabox binds to port 80"
    Kalabox uses port 80 on your machine, so make sure it is free before you attempt an install.

If you do not have a GUI based Software Center you can install the `.rpm` pkg on the command line.

```bash
sudo dnf update -y
sudo dnf install bridge-utils iptables cgroup-bin
sudo rpm -i kalabox.deb
```

Common Installation Issues
--------------------------

### OSX

!!! danger "Installaton Failed"
    Please check out our two most common OSX installation issues
    1. [Duplicate host only adapter](./troubleshooting/#resolving-duplicate-host-only-adapters)
    2. [Using a different default shell than BASH](https://github.com/kalabox/kalabox/issues/1343)

### Windows

!!! danger "Installaton Failed"
    Please check out our two most common Windows installation issues
    1. [Duplicate host only adapter](./troubleshooting/#resolving-duplicate-host-only-adapters)

