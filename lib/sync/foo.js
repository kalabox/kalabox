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

syncRemote.addFolder('code', '/var/sync/code/', syncLocal)
.then(syncLocal.addFolder('code', '/var/sync/code/', syncRemote))
//.then(syncRemote.restart())
//.then(syncLocal.restart())
.then(function() {
  console.log('done');
})
.catch(function(err) {
  throw err;
});

/*syncRemote.getConfig()
.then(function(config) {
  console.log(JSON.stringify(config, null, '  '));
})
.catch(function(err) {
  throw err;
});*/
