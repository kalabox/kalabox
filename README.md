# Kalabox

A framework to build reusable, super fast, highly customizable, extensible and local integrated workflow solutions for all kinds of apps. **You can think about Kalabox as a super-fast, highly-customizable Vagrant for containers.**

With Kalabox you can

* Easily mimic your production environment on local
* Setup, develop, pull and deploy your sites super fast.
* Standardize your teams dev environments and tools on OSX, Windows and Linux.
* Easily customize or extend tooling, deployment options and basically any other functionality.

For more info on how you can do some of the above check out the [wiki](https://github.com/kalabox/kalabox/wiki).

## Installation

You can install Kalabox using `npm` or download one of our pre-built binaries. **Using a pre-built binary is the recommended way to install**. You can also install the development version of Kalabox by following the [Developer Guide](https://github.com/kalabox/kalabox/wiki/Contribution-Guide).

**If you've already installed Kalabox and it's pre-version 0.10.0 you should
[uninstall](https://github.com/kalabox/kalabox/wiki/Uninstalling-Kalabox/) first.**

### Installing with a pre-built binary

Download one of the the below.

1. [kbox-macosx-amd64-v0.10.2](https://github.com/kalabox/kalabox/releases/download/v0.10.1/kbox-macosx-amd64-v0.10.2)
2. [kbox-windows-amd64-v0.10.2](https://github.com/kalabox/kalabox/releases/download/v0.10.1/kbox-windows-amd64-v0.10.2.exe)
3. [kbox-debian-amd64-v0.10.2](https://github.com/kalabox/kalabox/releases/download/v0.10.1/kbox-debian-amd64-v0.10.2)

Put it in a directory that exists in your `$PATH` environmental variable and on `OSX/LINUX` make sure it is executable. 

On OSX
```bash
mv ~/Downloads/kbox-macosx-amd64-v0.10.1 /usr/local/bin/kbox
chmod +x /usr/local/bin/kbox
cd ~/Desktop && kbox create pantheon
```

### Installing with NPM

Please make sure that you have installed [nodejs](http://nodejs.org/) first and that it has the [correct permissions](https://docs.npmjs.com/getting-started/fixing-npm-permissions). If you get `EACCESS` errors on `npm install` then schedule an appointment with the [Doc](https://github.com/mattgrill/NPM-Doctor).

```bash
npm install kalabox -g
```

## Getting started

Kalabox is all about quickly setting up repeatable sets of infrastructure so you can start developing the next best thing. While you can [manually create your own apps and profiles](https://github.com/kalabox/kalabox/wiki/Creating-custom-apps) to use in your own Kalabox we've put some basic integrations together for so you can easily connect to your hosting provider and pull down your site and its environments.

Here is how you would pull down a site from Pantheon. For more info about Pantheon integration check out our [Pantheon Guide.](https://github.com/kalabox/kalabox/wiki/Pantheon-Guide)

```
cd /dir/i/want/my/app/to/live
kbox create pantheon
cd my-app
kbox start
kbox # This will list all the fun commands you get in your app
cd code # This is where your code lives by default.
# Site is available at http(s)://my-app.kbox
```

Please also note that you can pass in a bunch of options to `kbox create` so make sure to check out the options for each create task by running it with `-- -h` first. Here is an example of what is possible for a Pantheon app.

```
kbox create pantheon -- -h
Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  --email        Pantheon dashboard email.                              [string]
  --password     Pantheon dashboard password.                           [string]
  --uuid         Pantheon site machine name.                            [string]
  --env          Pantheon site environment.                             [string]
  --name         The name of your app.                                  [string]
  --build-local  Build images locally instead of pulling them remotely.
                                                                       [boolean]
  --dir          Creates the app in this directory. Defaults to CWD.    [string]
```

## Kbox commands

You can run `kbox` at any point to see the usage, commands and options available to you. You will also get additional commands when you are in an app folder.

Here is an example of `kbox` from a non-app directory. We keep things simple.

```
kbox

Usage: kbox.js <command> [-- <options>]

Global commands that can be run from anywhere
  apps             Display list of apps.
  config           Display the kbox configuration.
  containers       Display list of all installed kbox containers.
  create       
      pantheon     Creates a Pantheon app.
  update           Run this after you update your Kalabox code.
  version          Display the kbox version.

Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
```

## Sharing

Kalabox uses syncthing to share your files between the container and your OS.
Syncthing is also still in development so if you are experiencing trouble check out our [syncthing guide](https://github.com/kalabox/kalabox/wiki/Syncthing-Guide).

## Other Resources

* [API docs](http://api.kalabox.me/)
* [Test coverage reports](http://coverage.kalabox.me/)
* [Kalabox CI dash](http://ci.kalabox.me/)
* [Mountain climbing advice](https://www.youtube.com/watch?v=tkBVDh7my9Q)
* [Boot2Docker](https://github.com/boot2docker/boot2docker)
* [Syncthing](https://github.com/syncthing/syncthing)
* [Docker](https://github.com/docker/docker)

-------------------------------------------------------------------------------------
(C) 2015 Kalamuna and friends and things


