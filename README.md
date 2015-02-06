# Kalabox

This project is currently under heavy development. The documentation here is currently directed towards developers working on the project. It was last updated to reflect changes in v0.3.0. For other changes please check the [changelog](https://github.com/kalabox/kalabox/blob/master/CHANGELOG.md)

Please make sure that you have installed [nodejs](http://nodejs.org/) first!

## Normal Install

```bash
npm install kalabox -g
```

* At this point most people able to use the project are probably going to want to do the Developer Install.

## Developer Install

```bash
cd ~
git clone git@github.com:kalabox/kalabox.git
cd kalabox
npm install

# link kbox executable, you may have to remove /usr/local/bin/kbox first!!! -
# USE FULL PATH TO bin, like in OS X if you've installed kalabox at /User/$USER/kalabox use
# ln -s /Users/$USER/kalabox/bin/kbox.js /usr/local/bin/kbox
ln -s bin/kbox.js /usr/local/bin/kbox

# OSX
kbox provision

# Ubuntu
# COMING SOON

# Windows
# COMING SOON
```

## Some commands

You can run `kbox` at any point to see the list of commands and apps available. Note that some commands may appear but won't work unless you've run `kbox up`.

Here is an example

```
apps
config
containers
down
drupal7
    config
    containers
    inspect
    install
    restart
    start
    stop
    uninstall
drupal7-kalastack-docker
    config
    containers
    inspect
    install
    restart
    start
    stop
    uninstall
hotsauce-legacy
    config
    containers
    inspect
    install
    restart
    start
    stop
    uninstall
provision
up
```

### Engines, providers and services! OH MY!

Kalabox loosesly defines a "provider" as the underlying tech that is needed to run your "engine" where engine is loosely defined as something that handles container orhcestration. "Services" are defined as the set of additional containers that are needed to run apps. More on this later.

Generally `kbox up` and `kbox down` are used to activate the provider and get the engine into a position where it can begin to "do app things" ie install, start, stop and uninstall apps.

### Engines

Kalabox has an interface to support various engines. More details on that [here](http://api.kalabox.me/engine.html). Currently, Kalabox ships with a `docker` based implementation but you can write your own implementation and swap it out using the `engine` key in the global config file. See below.

### Provider

Similarly to engines, Kalabox has an interface that engines can use for various providers. Providers can be thought of as installation magic needed to support a given engine. So to run on the `docker` engine on MacOSX and Windows Kalabox currently uses the `Boot2Docker` provider. You can read more about the interface [here](http://api.kalabox.me/provider.html). Engine will usually select the correct provider based on the users environment. On Mac/Windows this will be Boot2Docker... if you were hypothetically running a future version of Kalabox on Linode this might be possible with the not currently extant `debian` provider.

### Services

To check the current status of the VM you can run `boot2docker --vm="Kalabox2" status`.

### Global configuration

User's can override some global configuration by putting a file called `kalabox.json` in `~/kalabox/`. Here is an example of the things you can override:

```json
{
  "appsRoot": "/Users/tturner/Desktop/kalabox-app-examples",
  "codeRoot": "/Users/tturner/kalabox/code",
  "domain": "kbox",
  "engine": "docker",
  "globalPluginRoot": "/Users/tturner/kalabox/plugins",
  "globalPlugins": [
    "hipache",
    "kalabox_core",
    "kalabox_install",
    "kalabox_app",
    "kalabox_provider"
  ],
  "home": "/Users/tturner",
  "kalaboxRoot": "/Users/tturner/kalabox",
  "kboxRoot": "/Users/tturner/kalabox",
  "services": "kalabox",
  "srcRoot": "/Users/tturner/Desktop/kalabox",
  "sysConfRoot": "/Users/tturner/.kalabox"
}

```

## Plugins
```
Kalabox also comes with a plugin system which allows for users to grab additional contrib functionality from npm or to write their own global or app specific plugins. Kalabox drinks its own plugin system to implement the CLI so you can check out the plugin folder for some examples. Here is a basic example of "hello world" plugin that prints "a british tar" before every db container is started. Each plugin can register tasks, can grab some dependencies to use and can tap into various events. These are detailed below.

### Dependencies

Each plugin can tap into various registered dependencies for usage within the plugin. Here is a brief description of some of the currently available dependencies.

```js
// Usually either 'cli' or 'gui'
deps.register('mode', kbox.core.mode.set('cli'));

// A shell module to exec some commands
deps.register('shell', shell);

// Events to hook into
deps.register('events', kbox.core.events);

// Arguments and options specified on the CLI
deps.register('argv', argv);

// To add/remove/inspect tasks
deps.register('tasks', tasks);

// The global Kalabox config
var globalConfig = config.getGlobalConfig();
deps.register('globalConfig', globalConfig);

// An alias for the global Kalabox config
deps.register('config', globalConfig);

// All the methods on the engine
kbox.engine.init(globalConfig);
deps.register('engine', kbox.engine);

// All the methods on the services
kbox.services.init(globalConfig);
deps.register('services', kbox.services);

// The provider module being used
deps.register('providerModule', engine.getProviderModule());

// Host and port config for the engine
deps.register('engineConfig', config);

```

Example of a simple plugin using some dependencies.

```js
'use strict';

/**
 * This exposes some commands if you need to turn the engine on.
 */

var chalk = require('chalk');

module.exports = function(engine, events, tasks, services) {

  if (engine.provider.hasTasks) {
    // Tasks
    // Start the kalabox engine
    tasks.registerTask('up', function(done) {
      engine.up(done);
    });

    // Stop the kalabox engine
    tasks.registerTask('down', function(done) {
      engine.down(done);
    });

    // Events
    events.on('post-up', function(done) {
      console.log(chalk.green('Kalabox engine has been activated.'));
      done();
    });

    events.on('post-down', function(done) {
      console.log(chalk.red('Kalabox engine has been deactivated.'));
      done();
    });
  }

};

```



### Tasks

### Events

Here are a list of the events Kalabox currently implements and an example.

```js
'use strict';

module.exports = function(app) {

  /**
   * Listens for post-start-component
   * - Does some gilbert and sullivan things
   */
  app.on('post-start-component', function(component) {
    if (component.key === 'db') {
      console.log('A BRITISH TAR IS A SOARING SOUL!')
    }
  });

```

### Tasks

## Sharing

Right now Kalabox uses syncthing for sharing. Syncthing is a nifty p2p client written in Go that works kind of like a bi-directional auto rsync. What this means


## Apps

Kalabox provides some common things to help you build apps. The core of an app is the kalabox.json which specifies the name of the app, plugins to load and the infrastructure to run the app. Currently apps must be stored in ~/kalabox/apps (or whatever `kbox config | grep appsRoot` displays). Soon you will be able to run apps from anywhere.

You can check out some basic examples at [kalabox-app-examples](https://github.com/kalabox/kalabox-app-examples). Here is a brief setup guide:


## Other Resources

