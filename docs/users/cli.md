Usage
=====

The Kalabox CLI is accessible via your terminal by typing `kbox` at the prompt, which will display the list of commands you can run.

```bash
kbox
Usage: kbox.dev <command> [-- <options>]

Global commands that can be run from anywhere
  create
      backdrop     Creates a backdrop app
      drupal7      Creates a drupal7 app
      drupal8      Creates a drupal8 app
      pantheon     Creates a Pantheon app.
      wordpress    Creates a wordpress app
  env              Stop and then start a running kbox application.
  list             Display list of apps.
  version          Display the kbox version.

Actions that can be performed on this app
  config           Display the kbox application configuration.
  destroy          Completely destroys and removes an app.
  rebuild          Rebuilds your app while maintaining your app data.
  restart          Stop and then start a running kbox application.
  services         Display connection info for services.
  start            Start an installed kbox application.
  stop             Stop a running kbox application.
```

Kalabox operates in one of two contexts:

  * **Global** - This is any directory that does not contain a Kalabox app.
  * **App** - This is any directory which does contain an app.

The context will determine the list of commands you can run. If you have app context then the commands you run will apply to the app. In the example above Kalabox is running in an app context. You will see that Kalabox will group the commands into seperate contexts for you.

!!! tip "Easily switch contexts"
    If you are in a different app or global context you can easily run a command against another app using the `kbox <APPNAME> command` syntax.

Here are all the core commands provided by the Kalabox CLI out of the box and without using a special app generating plugin.

config
------

`kbox config` will print out the currently active Kalabox configuration. If you are inside of an app context then Kalabox will merge in your app config into your global config.

### Usage

Runs from either an app or global context.

```bash
# From a global context
kbox config
{
  "appRegistry": "/Users/pirog/.kalabox/appRegistry.json",
  "appsRoot": "/Users/pirog/.kalabox/apps",
  "configSources": [
    "/Applications/Kalabox.app/Contents/MacOS/kalabox.yml",
    "/Users/pirog/Desktop/work/kalabox/kalabox.yml",
    "DEFAULT_GLOBAL_CONFIG",
    "ENV_CONFIG"
  ],
  "devMode": true,
  "domain": "kbox",
  "downloadsRoot": "/Users/pirog/.kalabox/downloads",
  "engine": "kalabox-engine-docker",
  "engineGid": 50,
  "engineId": 1000,
  "engineRepo": "kalabox",
  "globalPlugins": [
    "kalabox-core",
    "kalabox-cmd",
    "kalabox-services-kalabox",
    "kalabox-sharing",
    "kalabox-ui",
    "kalabox-app-pantheon",
    "kalabox-app-php"
  ],
  "home": "/Users/pirog",
  "imgVersion": "latest",
  "isBinary": false,
  "isNW": false,
  "logLevel": "debug",
  "logLevelConsole": "none",
  "logRoot": "/Users/pirog/.kalabox/logs",
  "os": {
    "type": "Darwin",
    "platform": "darwin",
    "release": "15.5.0",
    "arch": "x64"
  },
  "srcRoot": "/Users/pirog/Desktop/work/kalabox",
  "stats": {
    "report": true,
    "url": "http://stats-v2.kalabox.io"
  },
  "sysConfRoot": "/Applications/Kalabox.app/Contents/MacOS",
  "sysPluginRoot": "/Applications/Kalabox.app/Contents/MacOS",
  "userConfRoot": "/Users/pirog/.kalabox",
  "userPluginRoot": "/Users/pirog/.kalabox",
  "version": "0.13.0-alpha.1"
}

```

create
------

`kbox create` is a special kind of command that allows app generating plugins such as the [Pantheon](http://pantheon.kalabox.io) and [PHP](http://php.kalabox.io) plugins to automatically build certain kinds of apps with either a nice CLI questionarire or GUI pointy-clicky workflow.

### Usage

This command can only be run from a global context.

Please consult the respective documentation for the implementing apps for more details on this commands usage.

destroy
-------

`kbox destroy` will completely remove an app and its code. This means that after you run this command the containers, services, tooling and all local files for this app will be gone.

### Usage

You need to have an app context to run this command.

```bash
# Print available options for this command
kbox.dev destroy -- -h
Options:
  -y, --yes      Automatically answer affirmitive                      [boolean]

# Destroy an app without a confirmation prompt
cd /to/app1
kbox destroy -- -y

# Destroy another app with a confirmation prompt
kbox app2 destroy
```

!!! attention "Only destroys an app, not Kalabox itself!"
    This command should not be confused with uninstalling Kalabox. It **will only** destroy the app that you use it on.

env
---

`kbox env` will print out a list of environmental variables that Kalabox sets dynamically. This list will be different depending on whether you are in a global or app context. Some apps, such as Pantheon apps, will add additional variables for you to use.

### Usage

```bash
# Run from a basic HTML app
# This is a non-exhaustive list
KALABOX_DEV=true
KALABOX_APP_REGISTRY=/Users/pirog/.kalabox/appRegistry.json
KALABOX_APPS_ROOT=/Users/pirog/.kalabox/apps
KALABOX_DEV_MODE=false
KALABOX_DOMAIN=kbox
KALABOX_ENGINE=kalabox-engine-docker
KALABOX_ENGINE_GID=50
KALABOX_ENGINE_ID=1000
KALABOX_ENGINE_REPO=kalabox
KALABOX_HOME=/Users/pirog
KALABOX_IMG_VERSION=latest
KALABOX_SRC_ROOT=/Users/pirog/Desktop/work/kalabox
KALABOX_VERSION=0.13.0-alpha.1
KALABOX_ENGINE_IP=10.13.37.100
KALABOX_ENGINE_REMOTE_IP=10.13.37.1
KALABOX_ENGINE_HOME=/Users/pirog
KALABOX_APP_NAME=html1.example
KALABOX_APP_DOMAIN=kbox
KALABOX_APP_HOSTNAME=html1.example.kbox
KALABOX_APP_URL=http://html1.example.kbox
KALABOX_APP_ROOT=/Users/pirog/Desktop/apps/kalabox-app-examples/html1
KALABOX_APP_ROOT_BIND=/Users/pirog/Desktop/apps/kalabox-app-examples/html1
KALABOX_APP_SERVICES={}
```

!!! tip "PRO TIP: Level up your `kalabox-compose.yml`"
    You can use these environmental variables when constructing your `kalabox-compose.yml` file. This can give you a lot of power and flexibilty when crafting your app.

### Example: Kalabox Compose file using custom Kalabox environmental variables

```yml
web:
  image: nginx:stable

  # Set our hostname dynamically
  hostname: $KALABOX_APP_HOSTNAME

  # Share our apps config directory into the web container at /src
  volumes:
    - $KALABOX_APP_ROOT_BIND/config:/src

  # Pass in the local user UID/GID
  environment:
    KALABOX_UID: $KALABOX_ENGINE_ID
    KALABOX_GID: $KALABOX_ENGINE_GID

  ports:
    - "80"
```

list
----

`kbox list` will display a list of your apps with some summary information about them.

### Usage

Runs from either an app or global context.

```bash
# Print available options for this command
kbox list -- -h
Options:
  -n, --names    Only display app names.                               [boolean]

# List my apps
kbox list
{
  "name": "html1.example",
  "url": "http://html1.example.kbox",
  "type": "example",
  "version": "0.13.0-alpha.1",
  "location": "/Users/pirog/Desktop/apps/kalabox-app-examples/html1",
  "running": false
}
{
  "name": "playbox",
  "url": "http://playbox.kbox",
  "type": "pantheon",
  "version": "0.13.0-alpha.1",
  "location": "/Users/pirog/Desktop/apps/playbox",
  "running": true
}
```

rebuild
-------

`kbox rebuild` is a powerful command which will completely rebuild the containers and services you use to run your app. This command is great for developing, tweaking or updating your app.

### Usage

You need to have an app context to run this command.

```bash
# Rebuild my app with verbose mode on so I can see WTF is happening!
kbox rebuild -- -v
```

!!! danger "Be careful using this command! It rebuilds EVERYTHING"
    If you have application data or code stored in a web or database container this data will be lost as well unless you have properly volumed it or written a plugin to ensure the data sensitive container is not included in the rebuild.

    For example the [Pantheon](http://github.com/kalabox/kalabox-app-pantheon) and [PHP](http://github.com/kalabox/kalabox-app-php) plugins store all application data in a `data` container which is removed during rebuilds for those apps.

  restart
-------

`kbox restart` is a simple wrapper that runs `kbox stop` and `kbox start` in succession.

### Usage

You need to have an app context to run this command.

```bash
# Restart my app
cd /to/app
kbox restart

# restart another app
kbox app3 restart
```

!!! tip "Good to resolve random issues"
    Sometimes if your Kalabox is giving you a tough go doing a simple restart can flush out the issue.

start
-------

`kbox restart` will start your Kalabox app. It will also build the app if this is the first time you've started it.

### Usage

You need to have an app context to run this command.

```bash
# Start my app using verbose mode, good to use on the first start
cd /to/app
kbox start -- --verbose

# Start another app
kbox app55 start
```

!!! note "First run could take a bit"
    If this is the first time you are starting your Kalabox app it will try to setup all the services and containers you need to run and develop your app.

    This could take a bit of time depending on constitution of the app. For this reason we recommend first starts use the `--verbose` flag so users can see what is going on.

stop
-------

`kbox stop` will stop your Kalabox app.

### Usage

You need to have an app context to run this command.

```bash
# Stop my app
kbox stop
```

!!! tip "Good to stop apps you aren't using"
    Kalabox gets great scale and performance using docker containers but its still a good practice to shut down apps that you are not actively using.

version
-------

`kbox version` will print out the current version of Kalabox you are using.

### Usage

Runs from either an app or global context.

```bash
kbox version
0.13.0-alpha.1
```

Additional Commands
-------------------

Please consult the [configuration](./config.md) and [customization](./custom.md) pages to learn more about adding your own custom commmands. Custom commands allow you to do some of the following things.

  1. Pull down sites from a hosting provider.
  2. Add additional tools to your app like `npm`, `grunt` or `gulp`.

!!! tip "Scope existing app generating plugins for help"
    Check out the [Pantheon](http://github.com/kalabox/kalabox-app-pantheon) and [PHP](http://github.com/kalabox/kalabox-app-php) plugins for some ideas on how to add in your custom workflows.

Using Options
-------------

### Global options

The following options are available for every command.

```bash
-h, --help     Display help message.                                 [boolean]
-v, --verbose  Use verbose output.                                   [boolean]
--debug        Use debug output.                                     [boolean]
```

### Examples

```bash
# Get help on how to use `kbox create pantheon`
kbox create pantheon -- -h

# Rebuilds a kalabox app with verbose output
kbox rebuild -- --verbose
```

!!! attention "Note the `--` separator."
    Kalabox uses the `--` separator for options. The reason for this is we need a way to differentiate between options that might be intended for a subcommand vs options that are for Kalabox itself. Consider the difference between `kbox npm install -v` vs `kbox npm install -- -v`. The former tells `npm` to give us verbose output whereas the latter tells `kbox` to give us verbose output.
