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

## AppManager API
```
var AppManager = require('./appmanager.js');
var am = new AppManager('/path/to/app/config');

// Get a list of app configs/states
var apps = am.getApps();

// Instantiate an app object
var app = new am.App('myd8site');

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
```

## Gulp Demo

Gulp at this point is only used for demonstrating the use of `AppManager`.
```
# list apps
gulp list

# pull all defined images (be patient)
gulp pull --app myd8site

# build images
gulp build --app myd8site

# create containers & start app
gulp init --app myd8site

# start app
gulp start --app myd8site

# stop app
gulp stop --app myd8site

# restart app
gulp restart --app myd8site

# kill app containers
gulp kill --app myd8site

# remove app containers
gulp remove --app myd8site
```
