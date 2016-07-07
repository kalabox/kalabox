
The Engine
==========

The Kalabox engine is what powers the container magix of Kalabox. At a high level, the engine is just a slightly customized Docker daemon. This customization exists so we do not collide with any of the user's existing Docker daemons.

There are a few differences on how this works between Linux and OSX/Windows which are detailed in sections below.

Engine for OSX/Win
------------------

In order to spin up Docker containers you need a recent version of the Linux kernel. As you might imagine, Windows and OSX do not contain the Linux kernel. As such Kalabox will spin up a small virtual machine during install to do this. The general pieces we use to do this are as follows:

* **VirtualBox** - We use Oracle's [VirtualBox](http://virtualbox.org) as the virtualization engine. After you install Kalabox you should be able to open up VirtualBox and see a VM called "Kalabox2".
* **Docker Machine** - We use [Docker Machine](https://docs.docker.com/machine/) to handle the management of the Kalabox engine.
* **Boot2Docker** - We use [Boot2Docker](https://github.com/boot2docker/boot2docker) as the actual VM image. Boot2Docker is a small ISO built on top of [Tiny Core Linux](http://tinycorelinux.net/).

!!! attention "Docker Beta for OSX/Windows"
    As soon as the Docker Beta for [Windows](https://docs.docker.com/docker-for-windows/) and [OSX](https://docs.docker.com/docker-for-mac/) becomes stable and has performant file sharing we intend to switch our backend over to that. This will greatly reduce our dependency chain, allowing for the removal of `docker-machine` and VirtualBox.

### Turning the engine on or off

The engine should automatically start when needed if you are running a CLI or GUI command that requires it. **This can sometimes take up to 30 seconds.** Turning off the GUI (without force quitting) will also deactivate the engine.

You should also be able to turn the engine on or off using these two hidden commands on the CLI

```bash
# Turn the Kalabox engine off
kbox down

# Turn the Kalabox engine on
kbox up
```

If you feel like the engine is **OUT OF CONTROL** and you want to try to manually kill it, try...

  1. Starting/stopping it through the VirtualBox GUI or VBoxManage CLI
  2. Starting/stopping the VM using the docker-machine utility

### Accessing the Engine directly

#### OSX

```bash
# You might want to consider adding this to your PATH variable
export DOCKER_MACHINE=/Applications/Kalabox.app/Contents/MacOS/bin/docker-machine

# This will drop you into the Kalabox2 VM
$DOCKER_MACHINE ssh Kalabox2
```

#### Windows

!!! note "Install Directory"
    This assumes you have installed Kalabox at `C:\Program Files\Kalabox`. Replace
    that directory below if your location is different.

```bash
# You might want to consider adding this to your PATH variable
set DOCKER_MACHINE="C:\Program Files\Kalabox\bin\docker-machine-exe"

# This will drop you into the Kalabox2 VM
%DOCKER_MACHINE% ssh Kalabox2
```

Engine for Linux
----------------

On Linux the Kalabox engine runs a custom Docker daemon via the [Docker Engine](https://www.Docker.com/products/docker-engine). This is an unsecure daemon which listens on `10.13.37.100:2375`.

### Turning the engine on or off

The Kalabox engine runs as a service. We support the `SysV`, `Upstart` and `systemd` init systems. By default the Kalabox service will launch when you boot your system but you can control it in the normal way.

```bash
sudo service kalabox start
sudo service kalabox stop
sudo service kalabox status
sudo service kalabox restart
```

### Accessing the engine directly

#### Linux

```bash
# Set your DOCKER_HOST to point to Kalabox
export DOCKER_HOST=tcp://10.13.37.100:2375

# Might want to consider adding this to your path
export DOCKER=/usr/share/kalabox/bin/docker
$DOCKER info
```
