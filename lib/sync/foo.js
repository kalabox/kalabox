'use strict';

var Sync = require('./sync.js');

var sync = new Sync('http://10.13.37.42:8080');

sync.test(function(err) {
  if (err) {
    throw err; 
  } else {
    console.log('done');
  }
});

/*sync.getConfig(function(err, config) {
  if (err) {
    throw err;
  } else {
    console.log(config);
    config.Options.RestartOnWakeup = false;
    sync.setConfig(config, function(err) {
      if (err) {
        throw err;      
      } else {
        console.log('done');
      }
    });
  }
});*/
