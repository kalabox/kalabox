# Kalabox

A framework to build reusable, super fast, highly customizable, extensible and local integrated workflow solutions for all kinds of apps. **You can think about Kalabox as a super-fast, highly-customizable Vagrant for containers.**

With Kalabox you can

* Easily mimic your production environment on local
* Setup, develop, and deploy your sites super fast.
* Standardize your teams dev environments and tools on OSX, Windows and Linux.
* Easily customize or extend tooling, deployment options and basically any other functionality.

For more info on how you can do some of the above check out the [wiki](https://github.com/kalabox/kalabox/wiki).

**This project is currently under heavy development and is changing quickly.**

## Installation

Please make sure that you have installed [nodejs](http://nodejs.org/) first and that it has the [correct permissions](https://docs.npmjs.com/getting-started/fixing-npm-permissions). If you get `EACCESS` errors on `npm install` then schedule an appointment with the [Doc](https://github.com/mattgrill/NPM-Doctor).

```bash
npm install kalabox -g
kbox provision
```

If you've already installed Kalabox and it's pre-version 0.9.0 you should consider
[uninstalling](https://github.com/kalabox/kalabox/wiki/Uninstalling-Kalabox/) first.

If you're running a pre 0.9.0 or lower you can be risky and check out the easy [update](https://github.com/kalabox/kalabox/wiki/Updating-Kalabox) guide.

If you are interested in contributing to the project check out the [developer installation guide](https://github.com/kalabox/kalabox/wiki/Contribution-Guide).

## Getting started

Kalabox is all about quickly setting up repeatable sets of infrastructure so you can start developing the next best thing. While you can [manually create your own apps and profiles](https://github.com/kalabox/kalabox/wiki/Creating-custom-apps) to use in your own Kalabox we've put together some basic ones to get you started with your Drupal or Backdrop or Wordpress project.

```
cd /dir/i/want/my/app/to/live
kbox create backdrop -- --name="My App"
cd my-app
kbox start
kbox # This will list all the fun commands you get in your app
cd code # This is where your code can live.
```

We also now offer support for Pantheon. You can easily pull your sites down from Pantheon or push up changes... and you do ALL THE DEV on a Pantheon-on-Kalabox environment. This means solr, redis, terminatur, wp-cli and drush are all instantly at your fingertips and they all work just like they do on Pantheon.

For more in depth instructions on getting these apps spun up and your sites imported check out both our [Drupal](https://github.com/kalabox/kalabox/wiki/Drupal-Guide), [Backdrop](https://github.com/kalabox/kalabox/wiki/Backdrop-Guide) or [Pantheon](https://github.com/kalabox/kalabox/wiki/Backdrop-Guide) guides.

Please also note that you can pass in a bunch of options to `kbox create` so make sure to check out the options for each create task by running it with `-- -h` first. Here is an example of what is possible for a Drupal app.


```
kbox create pantheon -- -h

Options:
  -h, --help      Display help message.                                [boolean]
  -v, --verbose   Use verbose output.                                  [boolean]
  --email         Pantheon dashboard email.                             [string]
  --password      Pantheon dashboard password.                          [string]
  --uuid          Pantheon site machine name.                           [string]
  --env           Pantheon site environment.                            [string]
  --name          The name of your app.                                 [string]
  --php-version   PHP version?                                          [string]
  --git-username  Your git username.                                    [string]
  --git-email     Your git email.                                       [string]
  --build-local   Build images locally instead of pulling them remotely.
                                                                       [boolean]
  --dir           Creates the app in this directory. Defaults to CWD.   [string]
```

## Kbox commands

You can run `kbox` at any point to see the usage, commands and options available to you. You will also get additional commands when you are in an app folder.

Here is an example of `kbox` from a non-app directory.

```
kbox

Usage: kbox <command> [-- <options>]

Examples:
  kbox apps -- -h
  kbox config -- --verbose

Commands:
  apps            Display list of apps.
  config          Display the kbox configuration.
  containers      Display list of all installed kbox containers.
  create
      backdrop    Creates a backdrop app.
      drupal      Creates a Drupal app.
      pantheon    Creates a Pantheon app.
  down            Bring kbox container engine down.
  ip              Display kbox container engine's ip address.
  provision       Install or update kbox and its dependencies.
  query           Run a command against a container.
  status          Display status of kbox container engine.
  up              Bring kbox container engine up.
  version         Display the kbox version.

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


