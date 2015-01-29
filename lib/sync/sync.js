'use strict';

var rest = require('./syncthingRest.js');

function Sync(address) {
  this.address = address;
}

Sync.prototype.__getConfig__ = function(cb) {
  rest.config(this.address, cb);
};

Sync.prototype.__setConfig__ = function(config, cb) {
  rest.configPost(this.address, config, cb);
};

Sync.prototype.__testChangeConfig__ = function(cb) {
  var self = this;
  this.__getConfig__(function(err, config) {
    if (err) {
      cb(err);
    } else {
      config.Options.RestartOnWakeup = !config.Options.RestartOnWakeup;
      self.__setConfig__(config, cb);
    }
  });
};

Sync.prototype.test = function(cb) {
  this.__testChangeConfig__(cb);
};

Sync.prototype.link = function(sync, cb) {
};

Sync.prototype.ping = function(cb) {
  rest.ping(this.address, cb);
};

Sync.prototype.restart = function(cb) {
  rest.restart(this.address, cb);
};

module.exports = Sync;
