Installation
============

Preinstall Checks
-----------------

1. Verify that your system meets the [minimum system and hardware requirements](../general/sysreq.md) to run Kalabox.
2. Verify that you are connected to the internet.
3. Verify that you have administrative access to your machine.
4. If you have previously installed Kalabox and are attempting to install a new  version check out our [update guide](./updating.md) before continuing.

macOS
-----

### Installation Steps

1. Download the `.dmg` package from [kalabox.io/download](http://kalabox.io/download)
2. Mount the DMG by double-clicking it
3. Double-click on the `KalaboxInstaller.pkg`
4. Go through the setup workflow
5. Enter your username and password when prompted
6. Launch the Kalabox CLI or GUI and start deving all the devs

Windows
-------

### Installation Steps

1. Download the Windows `.exe` package from [kalabox.io/download](http://kalabox.io/download)
2. Double-click on `kalabox.exe`
3. Go through the setup workflow
4. Approve various UAC prompts during install
5. After installation is finished make sure you [set up Shared Drives](https://docs.docker.com/docker-for-windows/#/shared-drives)
6. Launch the Kalabox CLI or GUI and start deving all the devs

!!! warning "IF YOU DO NOT DO STEP 5 YOU ARE GOING TO BE S.O.L."
    After installation is finished make sure you [set up Shared Drives](https://docs.docker.com/docker-for-windows/#/shared-drives)

Debian/Ubuntu
-------------

### Installation

1. Download the `.deb` package from [kalabox.io/download](http://kalabox.io/download)
2. Double-click on the `.deb` package to launch Software Center
3. Click the "Install" button and enter your password when prompted

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

If you do not have the GUI-based Software Center you can install the `.rpm` pkg on the command line.

```bash
sudo dnf update -y
sudo dnf install bridge-utils iptables cgroup-bin
sudo rpm -i kalabox.deb
```
