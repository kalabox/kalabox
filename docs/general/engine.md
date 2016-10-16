
The Engine
==========

Kalabox is powered by the [Docker Engine](https://www.docker.com/products/docker-engine).

  * On linux the engine runs as a custom docker daemon managed by Kalabox.
  * On macOS the engine runs in a small [xhyve](https://github.com/mist64/xhyve) VM which is provided by the [Docker for Mac](https://docs.docker.com/docker-for-mac/) project.
  * On Windows the engine runs in a small [Hyper-V](https://en.wikipedia.org/wiki/Hyper-V) VM which is provided by the [Docker for Windows](https://docs.docker.com/docker-for-windows/) project.

The engine should automatically start when needed if you are running a CLI or GUI command that requires it. **This can sometimes take up to 30 seconds depending on your computer.**

Manually turning the engine on
------------------------------

### Windows and macOS

You can manually start the engine on macOS or Windows by launching the "Docker for Mac/Windows" application.

### Linux

The Kalabox engine runs as a service. We support the `SysV`, `Upstart` and `systemd` init systems. By default the Kalabox service will launch when you boot your system but you can control it using the `service` command.

!!! note "`sudo` access required."
    You will be prompted for your password running the above since `service` requires `sudo` access.

```bash
sudo service kalabox start
sudo service kalabox stop
sudo service kalabox status
sudo service kalabox restart
```

Manually turning the engine off
-------------------------------

### Windows and macOS

The easiest way to manually stop the engine on macOS or Windows is to exit the "Docker for Mac/Windows" application. Note that this application is likely surfaced in your system tray or macOS top bar.

### Linux

The Kalabox engine runs as a service. We support the `SysV`, `Upstart` and `systemd` init systems. By default the Kalabox service will launch when you boot your system but you can control it using the `service` command.

!!! note "`sudo` access required."
    You will be prompted for your password running the above since `service` requires `sudo` access.

```bash
sudo service kalabox start
sudo service kalabox stop
sudo service kalabox status
sudo service kalabox restart
```

Accessing the Engine directly
-----------------------------

### Windows and macOS

Make sure you have unset any lingering `DOCKER_*` environmental variables.

```bash
# You should be able to run docker commands as normal
docker ps --all
docker images
docker info
```

### Linux

On Linux the Kalabox engine runs a custom Docker daemon via the [Docker Engine](https://www.Docker.com/products/docker-engine). This is an insecure daemon that listens on `10.13.37.100:2375`.

```bash
# Set your DOCKER_HOST to point to Kalabox
export DOCKER_HOST=tcp://10.13.37.100:2375

# Might want to consider adding this to your path
export DOCKER=/usr/share/kalabox/bin/docker
$DOCKER info
$DOCKER ps --all
$DOCKER images
```
