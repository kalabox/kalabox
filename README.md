# Kalabox

A framework to build reusable, super fast, highly customizable, extensible and local integrated workflow solutions for all kinds of apps. **You can think about Kalabox as a super-fast, highly-customizable Vagrant for containers.**

With Kalabox you can

* Easily spin up a containerized infrastructure to develop your site or app.
* Develop, provision and deploy super quickly.
* Standardize your teams dev environments and tools on OSX, Windows and Linux.
* Easily customize or extend tooling, deployment options and bascially any other functionality.

For more info on how you can do some of the above check out the [wiki](https://github.com/kalabox/kalabox/wiki).

**This project is currently under heavy development and is changing quickly.**

## Installation

Please make sure that you have installed [nodejs](http://nodejs.org/) first!

```bash
npm install kalabox -g
kbox provision
```

If you've already installed Kalabox and it's pre-version 0.6.0 you should consider
[uninstalling](https://github.com/kalabox/kalabox/wiki/Uninstalling-Kalabox/) first. If you're running 0.6.0 or higher check out the easy [update](https://github.com/kalabox/kalabox/wiki/Updating-Kalabox) guide.

If you are interested in contributing to the project check out the [developer installation guide](https://github.com/kalabox/kalabox/wiki/Contribution-Guide).

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
  down            Bring kbox container engine down.
  ip              Display kbox container engine's ip address.
  provision       Install or update kbox and it's dependencies.
  query           Run a command against a container.
  shields         Shield generator operation.
  status          Display status of kbox container engine.
  up              Bring kbox container engine up.
  version         Display the kbox version.

Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]

```

And specific command help.

```
kbox create drupal -- -h

Options:
  -h, --help       Display help message.                               [boolean]
  -v, --verbose    Use verbose output.                                 [boolean]
  --name           The name of your app.                                [string]
  --php-version    Your php version.                                    [string]
  --drush-version  The version of drush that you want.                  [string]
  --git-username   Your git username.                                   [string]
  --git-email      Your git email.                                      [string]
  -i, --install    Auto install app after creation.                    [boolean]
  --build-local    Build images locally instead of pulling them remotely.
                                                                       [boolean]
  -s, --start      Auto start app after creation. Requires --install.  [boolean]
  --dir            Creates the app in this directory. Defaults to CWD.  [string]
```

## Getting started

Kalabox is all about quickly setting up repeatable sets of infrastructure so you can start developing the next best thing. While you can [manually create your own apps and profiles](https://github.com/kalabox/kalabox/wiki/Creating-custom-apps) to use in your own custom Kalabox we've put together some basic ones to get you started with your Drupal or Backdrop project.

```
cd /dir/i/want/my/app/to/live
kbox create backdrop --name="My App"
cd my-app
kbox install && kbox start
kbox # This will list all the fun commands you get in your app
cd code # This is where your code can live.
```

You can also pass in a bunch of options so make sure to check out the options for each create task by running it with `-- -h` first. **In coming releases it will also be super easy to import your app or site from places like Pantheon and Microsoft Azure.**

## Sharing

Kalabox uses syncthing for sharing. Syncthing is a nifty p2p client written in Go that works kind of like a bi-directional auto rsync. This enables our apps to run super fast compared to something like NFS. You can turn sharing off by editing the `sharing` key in your global or user config file.

When you start an app you will get a folder inside your app called `code` which is where you should put your code files. For example if this were a Drupal app you would probably want to git clone the drupal project inside of `code`.

If you are importing a massive payload of files it may take a bit for everything to sync up. You can mitigate this by putting your code into the container first. If you arent seeing the code you think you should be seeing you can check out the syncthing UI on both your local machine or kalabox by going to the following places in your browser.

```
10.13.37.42:60008 # Kalabox Syncthing
127.0.0.1:60008 # Local Syncthing
```

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


