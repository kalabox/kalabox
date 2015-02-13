'use strict';

/*
 * Package module for the Kalabox 'Share Package'.
 */

var core = require('../core.js');
var events = core.events;
var share = require('../share.js');

exports.init = function() {
  // APP EVENT: pre-start
  events.on('post-start', function(app, done) {
    share.restart(done);
  });
  // APP EVENT: pre-stop
  events.on('post-stop', function(app, done) {
    share.restart(done);
  });
};
