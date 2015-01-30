'use strict';

var Sync = require('./sync.js');

var syncLocal = new Sync('http://127.0.0.1:8080');
var syncRemote = new Sync('http://10.13.37.42:8080');

/*syncLocal.linkDevices(syncRemote)
.then(function() {
  console.log('done');
})
.catch(function(err) {
  throw err;
});*/

syncLocal.__getConfig__()
.catch(function(err) {
  throw err;
})
.then(function(config) {
  console.log(JSON.stringify(config, null, '  '));  
});
