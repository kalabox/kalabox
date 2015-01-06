'use strict';

/*
 * Kalabox engine (docker) module.
 */

var core = require('./core.js');
var Dockerode = require('dockerode');

var container = require('./engine/container.js');
exports.container = container;

var image = require('./engine/image.js');
exports.image = image;

var state = {
  docker: null,
  dockerConfig: null
};

exports.getState = function() {
  return state;
};

exports.init = function(globalConfig) {
  core.env.ifElseLinux(
    function() {
      state.dockerConfig = globalConfig.dockerConfigLinux;
    },
    function() {
      state.dockerConfig = globalConfig.dockerConfig;
    }
  );
  state.docker = new Dockerode(state.dockerConfig);
};
