#!/usr/bin/env node

'use strict';

var kbox = require('../lib/kbox.js');
var Promise = require('bluebird');
var _ = require('lodash');

var opts = {
  mode: 'gui'
};

kbox.init(opts)
.then(function() {
  kbox.whenAppRegistered(function(app) {
    return Promise.delay(5 * 1000)
    .then(function() {
      console.log('APP-REGISTERED: ' + app.name);
    });
  });
  kbox.whenAppUnregistered(function(app) {
    console.log('APP-UNREGISTERED: ' + app.name);
  });
})
.then(function() {
  return kbox.app.get('bar')
  .then(function(app) {
    return kbox.setAppContext(app);
  });
})
.then(function() {
  return kbox.app.get('foo')
  .then(function(app) {
    return kbox.setAppContext(app);
  });
})
.then(function() {
  return kbox.app.get('bar')
  .then(function(app) {
    return kbox.setAppContext(app);
  });
})
.catch(function(err) {
  throw err;
})
.then(function() {
  console.log('DONE');
});
