## App Manager Concept

This is currently setup for OSX and Boot2Docker, with the B2D host of: `1.3.3.7`.

You can modify the docker property of config.json. See the `dockerode` project for formats.


## Install
```
npm install -g gulp
git clone git@github.com:mikemilano/appmanager.git
cd appmanager
npm install
gulp pull-images
gulp init
```

## Gulp Demo

Gulp at this point is only used for demonstrating the use of `AppManager`.
```
# list apps
gulp list

# pull all defined images (be patient)
gulp pull --app myd7site

# build images
gulp build --app myd7site

# create containers & start app
gulp init --app myd7site

# start app
gulp start --app myd7site

# stop app
gulp stop --app myd7site

# restart app
gulp restart --app myd7site

# kill app containers
gulp kill --app myd7site

# remove app containers
gulp remove --app myd7site
```

## AppManager API
```
var AppManager = require('./appmanager.js');
var am = new AppManager('/path/to/app/config');

// Get a list of app configs/states
var apps = am.getApps();

// Instantiate an app object
var app = new am.App('myd7site');

// Pull images defined in config
app.pull();

// Build images defined in config
app.build();

// pull/build images & create containers
app.init();

// Stop all app containers
app.stop();

// Start all app containers
app.start();

// Kill all app containers
app.start();

// Restart all app containers
app.restart();

// Remove all app containers
app.remove();
```

## AppManager.App Events

Events are based around the API tasks defined above. Events
are triggered before and after the task is complete.

There are 2 levels of events that appmanager emits:
- App level: Before and after all containers have been processed.
- Component level: Before and after each container has been processed.

The following example demonstrates listening for `start`, at both
levels, before and after the containers are started.
```
var AppManager = require('./appmanager.js');
var am = new AppManager('/path/to/app/config');
var app = new am.App('myd7site');

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


## Service Discovery via DNS

SkyDNS and SkyDock are used on the docker bridge for containers
to resolve IP addresses by a structured name.

SkyDock watches Docker events and auto-generates DNS records based
on container names.

By default, SkyDock uses format that doesn't work well with our needs,
but fortunately there's a plugin system which allows us to modify the
format.

The plugin below sets the following hostname format
```
<role>.<appname>.kbox`
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

We may be able to use `skydns` eventually, but for now, dnsmasq is used for
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
sudo echo 'nameserver 1.3.3.7' >> /etc/resolv.cnf
```

Windows:
```
???
```
