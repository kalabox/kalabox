'use strict';

var Sync = require('./sync.js');
var shell = require('../util/shell.js');
var core = require('../core.js');
var config = core.config;
var deps = core.deps;
// shell
deps.register('shell', shell);
// globalConfig
var globalConfig = config.getGlobalConfig();
deps.register('globalConfig', globalConfig);
deps.register('config', globalConfig);

var syncLocal = new Sync('127.0.0.1');

syncLocal.shutdown()
.then(function() {
  console.log('done');
})
.catch(function(err) {
  throw err;
});
