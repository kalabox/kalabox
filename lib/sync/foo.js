'use strict';

var Sync = require('./sync.js');

var syncLocal = new Sync('127.0.0.1');
var syncRemote = new Sync('10.13.37.42');

syncLocal.linkDevices(syncRemote)
.then(function() {
  return syncRemote.addFolder('code', '/var/sync/code/', syncLocal);
})
.then(function() {
  return syncLocal.addFolder('code', '/var/sync/code/', syncRemote);
})
.then(function() {
  syncLocal.restart();
})
.then(function() {
  syncRemote.restart();
})
.then(function() {
  console.log('done');
})
.catch(function(err) {
  throw err;
});
