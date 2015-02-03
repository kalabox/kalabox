'use strict';

var Sync = require('./sync.js');

var syncLocal = new Sync('127.0.0.1');
var syncRemote = new Sync('10.13.37.42');

syncLocal.clear()
.then(function() {
  return syncLocal.restart();
})
.then(function() {
  return syncRemote.clear();
})
.then(function() {
  return syncRemote.restart();
})
.then(function() {
  console.log('done')  ;
});
