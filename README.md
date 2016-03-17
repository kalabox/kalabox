# Kalabox Installer

The Kalabox Installer installs everything you need to get started with
Kalabox on Mac OS X, Windows and Linux. It includes the Kalalbox CLI,
Kalabox GUI and support tools like Docker Compose, Docker Machine, Syncthing
and VirtualBox.

## Installation and documentation

*Note:* Some Windows computers may not have VT-X enabled by default. It is required for VirtualBox. To enable VT-X, please see the guide [here.](http://www.howtogeek.com/213795/how-to-enable-intel-vt-x-in-your-computers-bios-or-uefi-firmware).

## Building the Kalabox Installer

Installers are built using Docker, so you'll need a Docker host set up. For example, using [Docker Machine](https://github.com/docker/machine):

```bash
$ docker-machine create -d virtualbox installer
$ eval "$(docker-machine env installer)"
```

Then to build the installer

```bash
# Builds for all platforms
make

# Builds for OSX
make osx

# Builds for Windows
make windows

# Builds for .deb/.rpm
make linux
```

The resulting installers will be in the `dist` directory.

## More info

Check out the [Kalabox wiki](https://github.com/kalabox/kalabox/wiki) for more info on various things.

## Other Resources

* [API docs](http://api.kalabox.me/)
* [Test coverage reports](http://coverage.kalabox.me/)
* [Kalabox CI dash](http://ci.kalabox.me/)
* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
* [Boot2Docker](https://github.com/boot2docker/boot2docker)
* [Syncthing](https://github.com/syncthing/syncthing)
* [Docker](https://github.com/docker/docker)

-------------------------------------------------------------------------------------
(C) 2016 Kalabox Inc and friends and things

