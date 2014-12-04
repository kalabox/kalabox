'use strict';

var kboxConfig = require('./kboxConfig.js');
var deps = require('./deps.js');

var config = kboxConfig.getGlobalConfig();
console.log(config);
var appConfig = kboxConfig.getAppConfig({name:'myapp3'});
//console.log(appConfig);

deps.register('config', appConfig);
deps.call(function(config) {
  console.log(config);
});
