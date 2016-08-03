Installation
============

Preinstall Checks
-----------------

1. Verify that your system meets the [minimum system and hardware requirements](http://docs.kalabox.io/general/sysreq/) to run Kalabox.
2. Verify that you are connected to the internet.
3. Verify that you have administrative access to your machine.
4. If you have previously installed Kalabox and are attempting to install a new  version check out our [update guide](./updating.md) before continuing.

Mac OSX
-------

### Installation Steps

1. Download the `.dmg` package from [kalabox.io/download](http://kalabox.io/download)
2. Mount the DMG by double-clicking it
3. Double-click on the `KalaboxInstaller.pkg`
4. Go through the setup workflow
5. Enter your username and password when prompted

Windows
-------

!!! note "Install in default location"
    It is currently recommended to install Kalabox in the default location of `C:\Program Files` if possible.

### Installation Steps

1. Download the Windows `.exe` package from [kalabox.io/download](http://kalabox.io/download)
2. Double-click on `kalabox.exe`
3. Go through the setup workflow
3. Approve various UAC prompts during install

!!! tip "White list *.kbox domains"
    White list *.kbox domains in relevant security software that may be interfering with our custom DNS. See this [Github issue](https://github.com/kalabox/kalabox/issues/891) for more information on the topic.

Debian/Ubuntu
-------------

### Installation

1. Download the `.deb` package from [kalabox.io/download](http://kalabox.io/download)
2. Double-click on the `.deb` package to launch Software Center
3. Click the "Install" button and enter your password when prompted

!!! Note "Kalabox binds to port 80"
    Kalabox uses port 80 on your machine, so make sure it is free before you attempt an install.

If you do not have the GUI-based Software Center you can install the `.deb` pkg on the command line.

```bash
sudo apt-get update -y
sudo apt-get install bridge-utils iptables cgroup-bin
sudo dpkg -i kalabox.deb
```

Fedora/RedHat
-------------

### Installation

1. Download the `.rpm` package from [kalabox.io/download](http://kalabox.io/download)
2. Double-click on the `.rpm` package to launch Software Center
3. Click the "Install" button and enter your password when prompted

!!! note "Kalabox binds to port 80"
    Kalabox uses port 80 on your machine, so make sure it is free before you attempt an install.

If you do not have the GUI-based Software Center you can install the `.rpm` pkg on the command line.

```bash
sudo dnf update -y
sudo dnf install bridge-utils iptables cgroup-bin
sudo rpm -i kalabox.deb
```

Common Installation Issues
--------------------------

### OSX

1. [Duplicate host only adapter](./troubleshooting/#resolving-duplicate-host-only-adapters)

### Windows

1. [Duplicate host only adapter](./troubleshooting/#resolving-duplicate-host-only-adapters)
2. [Problems enabling or using VT-x](https://github.com/kalabox/kalabox/issues/1141)

