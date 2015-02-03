'use strict';

var Sync = require('./sync.js');

var syncLocal = new Sync('127.0.0.1');
var syncRemote = new Sync('10.13.37.42');

syncLocal.linkDevices(syncRemote)
.then(function() {
  return syncLocal.shareFolder('code', syncRemote);
})
.then(function() {
  return syncLocal.restart();
})
.then(function() {
  return syncRemote.restart();
})
.then(function() {
  console.log('done');
})
.catch(function(err) {
  throw err;
});
