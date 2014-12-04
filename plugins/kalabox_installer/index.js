'use strict';

var _ = require('lodash');
var chalk = require('chalk');
var plugin = require('../../lib/plugin.js');
var deps = require('../../lib/deps.js');
var installer = require('../../lib/install.js');

module.exports = function(plugin, manager) {

  // @todo: infinite timeout?
  manager.registerTask('install', 60 * 60 * 1000, function(done) {
    installer.run(done);
  });

};
