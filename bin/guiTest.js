#!/usr/bin/env node

'use strict';

var kbox = require('../lib/kbox.js');
var Promise = require('bluebird');

kbox.init()
.then(function(globalConfig) {
  console.log(JSON.stringify(globalConfig, null, '  '));
});
