# Kalabox

This project is currently under heavy development. The documentation here is currently directed towards developers working on the project. It was last updated to reflect changes in `v0.3.0`. For other changes please check the [changelog](https://github.com/kalabox/kalabox/blob/master/CHANGELOG.md)

Please make sure that you have installed [nodejs](http://nodejs.org/) first!

## Normal Install

```bash
npm install kalabox -g
```

* At this point most people able to use the project are probably going to want to do the Developer Install.

## Developer Install

### OSX

```bash
cd ~
git clone git@github.com:kalabox/kalabox.git
cd kalabox
npm install

# link kbox executable, you may have to remove /usr/local/bin/kbox first!!! -
# USE FULL PATH TO bin, like in OS X if you've installed kalabox at /User/$USER/kalabox use
# ln -s /Users/$USER/kalabox/bin/kbox.js /usr/local/bin/kbox
ln -s bin/kbox.js /usr/local/bin/kbox

kbox provision
```

### Linux

```
cd ~
git clone git@github.com:kalabox/kalabox.git
cd kalabox
npm install

# link kbox executable
# USE FULL PATH TO bin
ln -s /home/pirog/Desktop/kalabox/bin/kbox.js /usr/local/bin/kbox

kbox provision
```

**DNS IS NOT HANDLED YET SO YOU WILL NEED TO ADD 10.13.37.42 AS A DNS SERVER**

See [Linux notes](https://github.com/kalabox/kalabox/wiki/Windows-Installation)

### Windows

Extract the latest Kalabox code in `C:\Users\bspears\Desktop\kalabox` and then open cmd.exe to run

```
cd C:\Users\bspears\Desktop\kalabox
npm install
node bin\kalabox.js provision
```

**DNS IS NOT HANDLED YET SO YOU WILL NEED TO ADD 10.13.37.42 AS A DNS SERVER**

See [Windows notes](https://github.com/kalabox/kalabox/wiki/Windows-Installation)

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

Kalabox loosesly defines a `provider` as the underlying tech that is needed to run your `engine` where engine is loosely defined as something that handles container orhcestration. `Services` are defined as the set of additional containers that are needed to run apps. More on this later.

Generally `kbox up` and `kbox down` are used to activate the provider and get the engine into a position where it can begin to "do app things" ie install, start, stop and uninstall apps.

### Engines

Kalabox has an interface to support various engines. More details on that [here](http://api.kalabox.me/engine.html). Currently, Kalabox ships with a `docker` based implementation but you can write your own implementation and swap it out using the `engine` key in the global config file. See below.

### Provider

Similarly to engines, Kalabox has an interface that engines can use for various providers. Providers can be thought of as the installation magic needed to support a given engine. So to run on the `docker` engine on MacOSX and Windows Kalabox currently uses the `Boot2Docker` provider. You can read more about the interface [here](http://api.kalabox.me/provider.html).

Engine will usually select the correct provider based on the users environment. On Mac/Windows this will be Boot2Docker. If you were hypothetically running a future version of Kalabox on Linode this might be possible with the not currently extant `debian` provider.

### Services

Services are any additional containers that are needed to support apps. This could be something like an `nginx` reverse proxy or `dnsmasq` or both. Different services backends can be swapped out in the global config using the `services` key.

Currently Kalabox implements a set of services called "Kalabox" that are used to support our `docker` based apps. Specifically we are using `hipache` as a reverse proxy, `dnsmasq` to handle requests to `.kbox` domains, `skydock` to troll the `docker` events stream for starts and stops and `skydns` to handle intra-docker dns resolution.

For more info on the services interface check out [this](http://api.kalabox.me/services.html).

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

Kalabox also comes with a plugin system which allows for users to grab additional contrib functionality from npm or to write their own global or app specific plugins. Kalabox drinks its own plugin system to implement the CLI so you can check out the plugin folder for some examples.

Here are some of the fun things you can use in your plugins and some basic examples. Each plugin can register tasks, can grab some dependencies to use and can tap into various events. These are detailed below.

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
deps.register('engineConfig', config)
```

Example of a simple plugin using some dependencies.

```js
// Dependencies get put into the function signature
module.exports = function(engine, events, tasks, services) {

  // Super awesome plugin code

};
```

### Tasks

You can also register specific tasks that do specific things. Registering tasks is fairly straightforward. Here is how we define a task to provision Kalabox.

```js
'use strict';

var installer = require('./installer.js');

module.exports = function(tasks) {

  tasks.registerTask('provision', function(done) {
    installer.run(done);
  });

};
```

### Events

One of the more powerful parts of plugins is the ability to hook into various events that are emitted during the Kalabox runtime. Here is a list of current events that you can hook into. We likely will add more in the future.

```js
// App events
// These events all get the app object

// Runs before an app is installed
events.emit('pre-install', app, callback);
// Runs after an app is installed
events.emit('post-install', app, callback);
// Runs before an app is started
events.emit('pre-start', app, callback);
// Runs after an app is started
events.emit('post-start', app, callback);
// Runs before an app is stopped
events.emit('pre-stop', app, callback);
// Runs after an app is stopped
events.emit('post-stop', app, callback);
// Runs before an app is uninstalled
events.emit('pre-stop', app, callback);
// Runs after an app is uninstalled
events.emit('post-stop', app, callback);

// Component events
// These events all get the component object
events.emit('pre-install-component', component, callback);
// Runs after an component is installed
events.emit('post-install-component', component, callback);
// Runs before an component is started
events.emit('pre-start-component', component, callback);
// Runs after an component is started
events.emit('post-start-component', component, callback);
// Runs before an component is stopped
events.emit('pre-stop-component', component, callback);
// Runs after an component is stopped
events.emit('post-stop-component', component, callback);
// Runs before an component is uninstalled
events.emit('pre-stop-component', component, callback);
// Runs after an component is uninstalled
events.emit('post-stop-component', component, callback);
```

And a great events example that prints a Gilbert and Sullivan lyric to console after every database container is started.

```js
'use strict';

module.exports = function(events) {

  events.on('post-start-component', function(component) {
    if (component.key === 'db') {
      console.log('A BRITISH TAR IS A SOARING SOUL!')
    }
  });

}
```

## Sharing

Right now Kalabox uses syncthing for sharing. Syncthing is a nifty p2p client written in Go that works kind of like a bi-directional auto rsync. Currently this is in a "stubbed out" state. When you start an app you will get a folder in `~/kalabox/code/<APPNAME>` which is where you should put your code. If you override the `codeRoot` in the global config then you will want to check that directory instead.

If you are importing a massive payload of files it may take a bit for everything to sync up. You can mitigate this by putting your code into the container first. If you arent seeing the code you think you should be seeing you can check out the syncthing UI on both your local machine or kalabox by going to the following places in your browser.

```
10.13.37.42:8080 # Kalabox Syncthing
127.0.0.1:8080 # Local Syncthing
```

## Apps

Kalabox provides some common things to help you build apps. The core of an app is the kalabox.json which specifies the name of the app, plugins to load and the infrastructure to run the app. Currently apps must be stored in ~/kalabox/apps (or whatever `kbox config | grep appsRoot` displays). Soon you will be able to run apps from anywhere.

You can check out some basic examples at [kalabox-app-examples](https://github.com/kalabox/kalabox-app-examples). Here is a brief setup guide:

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


