'use stict';

/*
 * Package module for the Kalabox 'Share Package'.
 */

var core = require('../core.js');
var events = core.events;
var share = require('../share.js');

exports.init = function() {
  // APP EVENT: pre-start
  events.on('pre-start', function(app, done) {
    console.log('share#pre-start');
    share.appStart(app, done);
  });
  // APP EVENT: pre-stop
  events.on('pre-stop', function(app, done) {
    console.log('share#pre-stop');
    share.appStop(app, done);
  });
};
