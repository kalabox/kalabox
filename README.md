# Kalabox

This project is currently under heavy development. The documentation here is currently directed towards developers working on the project. It was last updated to reflect changes in v0.2.0. For other changes please check the [changelog](https://github.com/kalabox/kalabox/blob/master/CHANGELOG.md)

Please make sure that you have installed [nodejs](http://nodejs.org/) first!

## Normal Install

At this point most people able to use the project are probably going to want to do the Developer Install.

```bash
npm install kalabox -g
```

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
kbox install

# Ubuntu
# Install Docker First
bin/setup_linux

# Windows
# COMING SOON
```

## Some commands

You can run `kbox` at any point to see the list of commands and apps available. Note that some commands are accessible but won't work unless you've run `kbox up`.

Here is an example

```
apps
config
down
hotsauce # this is an app that i had installed
    build
    config
    init
    kill
    pull
    remove
    restart
    start
    stop
install
ip
list
pc
status
up
```

### kbox up

On Windows and OSX you will need to make sure the Kalabox VM is turned on and runnning before you do kalabox things. It will be turned on for you automatically during installation but you may have to run `kbox up` or `kbox down` to start and stop it.

To check the current status of the VM you can run `kbox status`.

### Global configuration

User's can override some global configuration by putting a file called `kalabox.json` in `~/kalabox/`. Here is an example of the things you can override:

```json
{
  "domain": "kbox",
  "kboxRoot": ":home:/kalabox",
  "kalaboxRoot": ":kboxRoot:",
  // soon this will be an array of paths with some auto-handling
  "appsRoot": ":kboxRoot:/apps",
  "sysConfRoot": ":home:/.kalabox",
  "globalPluginRoot" : ":kboxRoot:/plugins",
  "globalPlugins": [
    "hipache",
    "kalabox",
    "kalabox_app",
    "kalabox_b2d"
  ],
  "redis" : {
    // this will soon be deprecated
    "host": "1.3.3.7",
    "port": 6379
  },
  // this will soon be set someplace else
  "dockerHost": "1.3.3.7",
  // this will soon be deprecated in favor of a function that can build the
  // start services. users will still be able to override.
  "startupServicePrefix": "kalabox_",
  "startupServices": {
    "kalaboxDebian": {
      "name": "kalabox/debian:stable",
      "containers" : {
        "kalaboxSkydns": {
          "name": "kalabox/skydns",
          "createOpts" : {
            "name": "skydns",
            "HostConfig" : {
              "NetworkMode": "bridge",
              "PortBindings": {
                "53/udp" : [{"HostIp" : "172.17.42.1", "HostPort" : "53"}]
              }
            }
          },
          "startOpts" : {}
        },
        "kalaboxSkydock": {
          "name": "kalabox/skydock",
          "createOpts" : {
            "name": "skydock",
            "HostConfig" : {
              "NetworkMode": "bridge",
              "Binds" : ["/var/run/docker.sock:/docker.sock", "/skydock.js:/skydock.js"]
            }
          },
          "startOpts" : {}
        },
        "kalaboxHipache": {
          "name": "kalabox/hipache",
          "createOpts" : {
            "name": "hipache",
            "HostConfig" : {
              "NetworkMode": "bridge",
              "PortBindings": {
                "80/tcp" : [{"HostIp" : "", "HostPort" : "80"}],
                "6379/tcp" : [{"HostIp" : "", "HostPort" : "6379"}]
              }
            }
          },
          "startOpts" : {}
        },
        "kalaboxDnsmasq": {
          "name": "kalabox/dnsmasq",
          "createOpts" : {
            "name": "dnsmasq",
            "Env": ["KALABOX_IP=1.3.3.7"],
            "ExposedPorts": {
              "53/tcp": {},
              "53/udp": {}
            },
            "HostConfig" : {
              "NetworkMode": "bridge",
              "PortBindings": {
                "53/udp" : [{"HostIp" : "1.3.3.7", "HostPort" : "53"}]
              }
            }
          },
          "startOpts" : {}
        }
      }
    }
  }
```

## Plugins
```
Kalabox also comes with a plugin system which allows for users to grab additional contrib functionality from npm or to write their own global or app specific plugins. Kalabox drinks its own plugin system to implement the CLI so you can check out the plugin folder for some examples. Here is a basic example of "hello world" plugin that prints "a british tar" before every db container is started.

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

## Apps

Kalabox provides some common things to help you build apps. The core of an app is the kalabox.json which specifies the name of the app, plugins to load and the infrastructure to run the app. Currently apps must be stored in ~/kalabox/apps (or whatever `kbox config | grep appsRoot` displays). Soon you will be able to run apps from anywhere.

You can check out some basic examples at [kalabox-app-examples](https://github.com/kalabox/kalabox-app-examples). Here is a brief setup guide:

Create `~/kalabox/kalabox.json` and add the following to it

```json
  {
    "home": "/Users/(YOURUSERNAME)",
    "appsRoot": "/Users/(YOURUSERNAME)/Desktop/kalabox-app-examples",
    "sysConfRoot": "/Users/(YOURUSERNAME)/.kalabox"
  }
```
then

```
  cd ~/Desktop
  git clone https://github.com/kalabox/kalabox-app-examples.git
  kbox # you should see "hotsauce" list as an app now
  kbox hotsauce pull
  kbox hotsauce build
  kbox hotsauce init
  kbox hotsauce start
```

Now visit `http://hotsauce.kbox` in your browser. It will likely tell you "no input file specified".

```
  # May need to set export DOCKER_HOST=tcp://1.3.3.7:2375 first
  docker exec -it kb_hotsauce_web /bin/bash
  # Now should be inside the docker container
  echo "<?php phpinfo(); ?>" > /data/code/index.php
  exit
```

Refresh your browser for the phpinfo page. Try downloading and installing drupal. The DB creds are currently

```
db: kalabox
u: kalabox
p:
host: hotsauce.kbox
```

Eventually all config will be stored in the environment.

### App Config

You will also see a `config` folder in the root of the hotsauce app. This allows you to easily change the settings of your services. For example, go into `config/php/php.ini` and change the `memory_limit` to something else. Then a simple `kbox hotsauce stop` and `kbox hotsauce start` and your new settings are there!

### App Kalabox.json

Currently the kalabox.json lets you specify which plugins and containers you want to use. Plugins and dockerfiles are looked for locally first, then in the kalabox source and finally on npm/dockerhub. Only 4 types of containers are currently supported. Additionally your `web` container is going to want set the proxy key.

```json
{
  "appName": "hotsauce-app",
  "appPlugins": [
    "hotsauce-plugin-drush",
    "hotsauce-plugin-hotsauce",
    "hotsauce-plugin-share"
  ],
  "appComponents": {
    "data": {
      "image": {
        "name": "hotsauce/data",
        "build": true,
        "src": "dockerfiles/hotsauce/data"
      }
    },
    "db": {
      "image": {
        "name": "kalabox/mariadb",
        "build": true,
        "src": "dockerfiles/kalabox/mariadb"
      }
    },
    "php": {
      "image": {
        "name": "hotsauce/php-fpm",
        "build": true,
        "src": "dockerfiles/hotsauce/php-fpm"
      }
    },
    "web": {
      "image": {
        "name": "hotsauce/nginx",
        "build": true,
        "src": "dockerfiles/hotsauce/nginx"
      },
      "proxy": [
        {
          "port": "80/tcp",
          "default": true
        }
      ]
    }
  }
}
```


## Other useful commands
```
# List apps & the status of apps kalabox knows about
kbox list

# purge non kalabox containers. i.e. remove all containers that do not start with kb_ or kala
kbox pc

```


