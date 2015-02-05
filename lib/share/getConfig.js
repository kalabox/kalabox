'use strict';

var Sync = require('./sync.js');

var syncLocal = new Sync('127.0.0.1');
var syncRemote = new Sync('10.13.37.42');

syncLocal.getConfig()
.then(function(config) {
  console.log(JSON.stringify(config, null, '  '));
})
.catch(function(err) {
  throw err;
});
