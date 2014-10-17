# Kalabox

This project is currently under heavy development. The
documentation here is currently directed towards developers
working on the project.


## Developer Install
```
git clone git@github.com:kalabox/kalabox.git
cd kalabox
npm install

# link kbox executable
ln -s bin/kbox.js /usr/local/bin/kbox

# OSX
# Install Boot2Docker First
bin/setup_osx

# Ubuntu
# Install Docker First
bin/setup_linux
```

## .kalabox file

Create a .kalabox.json file at the root of any project.

Example config of an app to use separate containers for each component:
```
{
  "title": "Drupal 7 App",
  "name": "d7-app",
  "plugins": {
    "d7": {}
  },
  "components": {
    "data": {
      "image": {
        "name": "kalabox/data-d7",
        "build": true,
        "src": "dockerfiles/kalabox/data-d7"
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
        "name": "kalabox/php-fpm",
        "build": true,
        "src": "dockerfiles/kalabox/php-fpm"
      }
    },
    "web": {
      "image": {
        "name": "kalabox/nginx",
        "build": true,
        "src": "dockerfiles/kalabox/nginx"
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

When `build` is set to `true`, the module will look for the `src` in the following order:
- Relative to the .kalabox.json file
- In the ~/.kalabox directory
- In the App manager source directory

When `build` is false, or not present, the module will attempt to pull the image via `docker pull`.


## kbox executable

Run `kbox` from the directory where the `.kalabox.json` file exists. It will
run the commands for whichever application is defined.

Meta data about the app an containers are stored in `~/.kalabox/apps/<appname>`
```
# pull all defined images (be patient)
kbox pull

# build images
kbox build

# create containers
kbox init

# start app
kbox start

# stop app
kbox stop

# restart app
kbox restart

# kill app containers
kbox kill

# remove app containers
kbox rm
```

## Plugin system

TODO: Plugin documentation


## App Events

Events are based around the API tasks defined above. Events
are triggered before and after the task is complete.

There are 2 levels of events that an app object emits:
- App level: Before and after all containers have been processed.
- Component level: Before and after each container has been processed.

The following example demonstrates listening for `start`, at both
levels, before and after the containers are started.
```
app.on('pre-start', function() {
  console.log(app.name, 'is about to start');
});

app.on('post-start', function() {
  console.log(app.name, 'just completed starting');
});

app.on('pre-start-component, function(component) {
  console.log(component.cname, ' is about to start');
});

app.on('post-start-component, function(component) {
  console.log(component.cname, ' just finished starting');
});
```

## Application names

App names should be 3 to x characters in length, consisting of lower
case alphanumeric characters and hyphens. `/a-z0-9-/`

The app name is used for the directory name, as well as the domain name.


## Inter-container DNS

SkyDNS and SkyDock are used on the docker bridge for containers
to resolve IP addresses by a structured name.

SkyDock watches Docker events and auto-generates DNS records based
on container names.

By default, SkyDock uses format that doesn't work well with our needs,
but fortunately there's a plugin system which allows us to modify the
format.

The plugin below sets the following hostname format
```
<component key>.<appname>.kbox`
```

The Plugin: `/skydock.js` on the Docker host system:
```
function createService(container) {
    var arr = container.Config.Hostname.split('.');
    return {
        Port: 80,
        Environment: arr[1],
        TTL: defaultTTL,
        Service: arr[0],
        Instance: removeSlash(container.Name),
        Host: container.NetworkSettings.IpAddress
    };
}
```

The run command in `/etc/init.d/docker` needs the following arguments
added for DNS to automatically get assigned to the containers:
```
 --bip=172.17.42.1/16 --dns=172.17.42.1
```

SkyDNS and SkyDock are pulled and started like this:
```
docker pull crosbymichael/skydns
docker pull crosbymichael/skydock
docker run -d -p 172.17.42.1:53:53/udp --name skydns crosbymichael/skydns -nameserver 8.8.8.8:53 -domain kbox
docker run -d -v /var/run/docker.sock:/docker.sock -v /skydock.js:/skydock.js --name skydock crosbymichael/skydock -ttl 30  -environment dev -s /docker.sock -domain kbox -name skydns -plugins /skydock.js
```

## Environment Variables

Each container has the following environment variables available:
```
APPNAME
APPDOMAIN
```

`APPDOMAIN` is: `<appname>.kbox`. In the examples here, it would be `d7site.kbox`.

Applications can programatically access other containers by appending `APPDOMAIN` to
the key of the component they want to connect to.

For example, if you have a `mysql` component which has a component key of `db`, then
it would be accessable by all containers via: `'db' + APPDOMAIN`, or in the case of
this example: `db.d7site.kbox`.


## Hipache Proxy

Hipache is used to proxy requests from the user's local system over `1.3.3.7` to the
appropriate container ip/port on the Docker bridge.

A component may be defined as a proxy in the application config.

```
{
  "title": "My Drupal 7 Site",
  "components": {
   "web": {
      "image": "pirog/kalastack-docker",
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

When a proxy is defined, the appmanager will create a record in hipache via redis
so that requests coming into the app domain on port 80 will be proxied to the
container ip/port of the `web` component.

```
docker pull hipache
docker run -d -P hipache
```

## Wildcard *.kbox DNS

We may be able to use `skydns` eventually, but for now, `dnsmasq` is used for
the user's local system to resolve .kbox addresses to the proxy service.

There is a dnsmasq docker build in the `dockerfiles` directory that is setup
with a wildcard configuration to direct `*.kbox` to `1.3.3.7`

Use this to build and run the service
```
cd dockerfiles/kalabox/dnsmasq
docker build -t kalabox/dnsmasq .
docker run -d --name dns -p 1.3.3.7:53:53 kalabox/dnsmasq
```

The last step is to configure the user's host to use 1.3.3.7 for DNS.

OSX:
```
sudo echo 'nameserver 1.3.3.7' > /etc/resolver/kbox
```

Linux:
```
sudo echo 'nameserver 127.0.0.1' >> /etc/resolv.cnf
```

Windows:
```
???
```

Goals:
- The user's project directory can be anywhere on their system
- App manager will not dictate the directory structure of a codebase. i.e. the public directory can be anywhere in the codebase.
-- ** Actual images used may dictate this, but custom images may be used
- App manager supports images defined in core, global plugins, or images defined in the codebase
- A project can be initialized (loaded into Kalabox) via the command line. i.e. `kbox init` in the project directory
- A VM is not required if Docker can run directly on the user's system

This is currently setup for OSX and Boot2Docker, with the B2D host of: `1.3.3.7`.
It could be run on a Ubuntu system w/o a VM

You can modify the docker property of config.json. See the `dockerode` project for formats.
