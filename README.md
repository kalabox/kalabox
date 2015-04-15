# Kalabox

A framework to build reusable, super fast, highly customizable, extensible and local integrated workflow solutions for all kinds of apps.

You can think about it as a superfast Vagrant for containers.

With Kalabox you can

    1. Easily spin up a containerized infrastructure to develop your site or app.
    2. Develop, provision and deploy super quickly.
    3. Standardize your teams dev environments and tools on OSX, Windows and Linux.
    4. Easily customize or extend tooling and deployment options.

[Read more](https://github.com/kalabox/kalabox/wiki)

**This project is currently under heavy development.**

## Key Features

1. [Pluggable backends](https://github.com/kalabox/kalabox/wiki/Pluggable-Backends)
2. [Easy app creation](https://github.com/kalabox/kalabox-app-examples)
3. [Plugins](https://github.com/kalabox/kalabox/wiki/Plugin-System)

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

--- Command Menu ---

apps          Display list of apps.
config        Display the kbox configuration.
containers    Display list of all installed kbox containers.
down          Bring kbox container engine down.
ip            Display kbox container engine's ip address.
provision     Install or update kbox and it's dependencies.
shields       Shield generator operation.
status        Display status of kbox container engine.
up            Bring kbox container engine up.
version       Display the kbox version.
```

And specific command help.

```
kbox shields -- -h

Options:
  -h, --help     Display help message.                                 [boolean]
  -v, --verbose  Use verbose output.                                   [boolean]
  -s, --status   Display shield generator status.                      [boolean]
  -w, --webcam   Semi-real time web cam snapshot of the Death Star.    [boolean]
```

## Building, installing and starting your local site/app.

To get started running and developing your apps with Kalabox please go check out [some examples](https://github.com/kalabox/kalabox-app-examples) to get started.

### Global configuration

User's can override some global configuration by putting a file called `kalabox.json` in the sysConfRoot (defaults to `~/.kalabox/`). You can also override system-wide or package kalabox with a override `kalabox.json` by putting it into the source directory. Here is an example of the things you can override

```json
{
	{
  "appRegistry": "/Users/mpirog/.kalabox/appRegistry.json",
  "appsRoot": "/Users/mpirog/kalabox/apps",
  "configSources": [
    "ENV_CONFIG",
    "DEFAULT_GLOBAL_CONFIG",
    "/Users/mpirog/.kalabox/kalabox.json"
  ],
  "domain": "kbox",
  "downloadsRoot": "/Users/mpirog/.kalabox/downloads",
  "engine": "kalabox-engine-docker@0.6.7",
  "globalPluginRoot": "/Users/mpirog/kalabox/plugins",
  "globalPlugins": [
    "kalabox-core",
    "kalabox-syncthing"
  ],
  "home": "/Users/mpirog",
  "kalaboxRoot": "/Users/mpirog/kalabox",
  "kboxRoot": "/Users/mpirog/kalabox",
  "logLevel": "debug",
  "logLevelConsole": "info",
  "logRoot": "/Users/mpirog/.kalabox/logs",
  "os": {
    "type": "Darwin",
    "platform": "darwin",
    "release": "14.3.0",
    "arch": "x64"
  },
  "profile": "dev",
  "provisioned": true,
  "services": "kalabox-services-kalabox@0.6.7",
  "sharing": true,
  "srcRoot": "/Users/mpirog/Desktop/kalabox",
  "sysConfRoot": "/Users/mpirog/.kalabox",
  "sysProviderRoot": "/Users/mpirog/.kalabox/.provider",
  "version": "0.6.0"
}
```

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
(C) 2015 Kalamuna and friends


