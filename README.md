# Kalabox

Kalabox is a free, integrated workflow solution for PHP, node, ruby and basically any other kind of application you can run inside a container. It’s the thing that connects all your things -- including your hosting account -- to provide a complete desktop-to-live workflow loop. First developed by Kalamuna as an internal tool, people all over the world now use it to code, test and go live faster than ever.

With Kalabox you can

    1. Easily spin up a containerized infrastructure to run your site or app
    2. Develop and deploy super quickly
    3. Add additional tooling like drush/git/node, integrate with CI, pull sites from github, push sites to Pantheon and tons more with our new plugin system!

[Read more](https://github.com/kalabox/kalabox/wiki)

**This project is currently under heavy development.** The documentation here is currently directed towards developers working on the project. It was last updated to reflect changes in `v0.3.0`. For other changes please check the [changelog](https://github.com/kalabox/kalabox/blob/master/CHANGELOG.md)

## Key Features

1. [Pluggable backends](https://github.com/kalabox/kalabox/wiki/Pluggable-Backends)
2. [Easy app creation](https://github.com/kalabox/kalabox-app-examples)
3. [Plugins](https://github.com/kalabox/kalabox/wiki/Plugin-System)

## Normal Install

Please make sure that you have installed [nodejs](http://nodejs.org/) first!

If you have installed a pre-0.3.0 version of Kalabox you might want to start by running the uninstall to clean up the cruft from a previous install. You can do that on the command line. Uninstalling VirtualBox is optional.

```
cd path/to/kalabox/repo
./scripts/uninstall-darwin.sh # on Windows this will be uninstall-win32.bat and on Linux it will be uninstall-linux.sh
```

And then the install magic

```bash
npm install kalabox -g
```

* At this point most people able to use the project are probably going to want to do the Developer Install.

## Developer Install

Please make sure that you have installed [nodejs](http://nodejs.org/) first!

If you have installed a pre-0.3.0 version of Kalabox you might want to start by running the uninstall to clean up the cruft from a previous install. You can do that on the command line. Uninstalling VirtualBox is optional.

```
cd path/to/kalabox/repo
./scripts/uninstall-darwin.sh # on Windows this will be uninstall-win32.bat and on Linux it will be uninstall-linux.sh
```

### OSX / Linux

```bash
cd ~
git clone https://github.com/kalabox/kalabox.git
cd kalabox
npm install

# link kbox executable.
# NOTE: you may have to remove /usr/local/bin/kbox first!
ln -s `pwd`/bin/kbox.js /usr/local/bin/kbox

kbox provision
```

### Windows

Extract the latest Kalabox code in `C:\Users\bspears\Desktop\kalabox` and then open cmd.exe **as an administrator** to run

```bash
cd C:\Users\bspears\Desktop\kalabox
npm install
node bin\kbox.js provision

# link kbox executable
cd C:\Users\bspears\AppData\Roaming\npm # may need to create this dir first
mklink kbox C:\Users\bspears\Desktop\kalabox\bin\kbox.js

```

When the install is done you will probably want to open up a mysysgit bash shell to run your kalabox commands.

Start by turning on kbox with `kbox up`

## Some commands

You can run `kbox` at any point to see the list of commands available. Note that some commands may appear but won't work unless you've run `kbox up`. You will also get additional commands when you are in an app folder.

Here is an example of `kbox` from a non-app directory.

```
apps
config
containers
down
provision
status
up
```

**`kbox apps`**

This will show a list of apps you have. Apps that are in the global appsRoot will be auto-discovered. The appRoot directory defaults to `~/tturner/kalabox/apps`. Apps outside of this directory will be added and visible after running `kbox install`.

**`kbox config`**

This will print out the current config for Kalabox. This is a great way to confir, whether config overrides specificed in `~/.kalabox/kalabox.json` have taken or not. More on that below...

**`kbox containers`**

This will list all the containers that currently exist in Kalabox. If you run it inside of an app directory you will get more fancy info about ports and things like that.

**`kbox down`**

Spin down kalabox.

**`kbox up`**

Spin up kalabox.

**`kbox status`**

Check to see whether Kalabox is up or down.

**`kbox provision`**

The initial setup and installation of Kalabox

## Apps

To get started running and developing your apps with Kalabox please go check out [some examples](https://github.com/kalabox/kalabox-app-examples) to get started.

### Global configuration

User's can override some global configuration by putting a file called `kalabox.json` in the sysConfRoot (defaults to `~/.kalabox/`). Here is an example of the things you can override:

```json
{
	"appRegistry": "/Users/mpirog/.kalabox/appRegistry.json",
	"appsRoot": "/Users/mpirog/kalabox/apps",
	"domain": "kbox",
	"engine": "docker",
	"globalPluginRoot": "/Users/mpirog/kalabox/plugins",
	"globalPlugins": [
		"kalabox_hipache",
		"kalabox_core",
		"kalabox_install",
		"kalabox_app",
		"kalabox_provider",
		"kalabox_syncthing"
	],
	"home": "/Users/mpirog",
	"kalaboxRoot": "/Users/mpirog/kalabox",
	"kboxRoot": "/Users/mpirog/kalabox",
	"logLevel": "debug",
	"logLevelConsole": "debug",
	"logRoot": "/Users/mpirog/.kalabox/logs",
	"services": "kalabox",
	"srcRoot": "/Users/mpirog/Desktop/kalabox",
	"sysConfRoot": "/Users/mpirog/.kalabox",
	"sysProviderRoot": "/Users/mpirog/.kalabox/.provider"
}

```

## Sharing

Right now Kalabox uses syncthing for sharing. Syncthing is a nifty p2p client written in Go that works kind of like a bi-directional auto rsync. This enables our apps to run super fast compared to something like NFS.

When you start an app you will get a folder inside your app called `code` which is where you should put your code files. For example if this were Drupal app you would probably want to git clone the drupal project inside of `code`.

If you are importing a massive payload of files it may take a bit for everything to sync up. You can mitigate this by putting your code into the container first. If you arent seeing the code you think you should be seeing you can check out the syncthing UI on both your local machine or kalabox by going to the following places in your browser.

```
10.13.37.42:60008 # Kalabox Syncthing
127.0.0.1:60008 # Local Syncthing
```

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


