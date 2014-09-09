## App Manager Concept

This is currently setup for OSX and Boot2Docker, with the B2D host of: `1.3.3.7`.

You can modify the docker host at the top of `appmanager.js`. See the `dockerode` project for formats.


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

// Pull images defined in config
am.pullImages();

// Create & start containers
am.createContainers();

// Stop all app containers
am.stopContainers();

// Start all app containers
am.startContainers();

// Restart all app containers
am.restartContainers();
```

## Gulp Demo

Gulp at this point is only used for demonstrating the use of `AppManager`.

You can see the path to the config, `myd8site` is hard coded in `gulpfile.js`.

If gulp were actually going to be used, we would need to parse arguments so the app name
could be passed in.


```
# pull all defined images (be patient)
gulp pull-images

# create containers
gulp init

# start containers
gulp start

# stop containers
gulp stop

# restart containers
gulp restart

# kill containers
gulp kill

# remove containers
gulp remove
```
