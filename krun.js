'use strict';

var _ = require('lodash');
var shell = require('shelljs');
var Promise = require('bluebird');

/*

call command
-> validate return code
-> validate output
-> repeat

*/

module.exports = function() {

  /*krun.run('up')
  .ok(callback)
  .call(function(done) {
    // do something.
    done();
  })
  .run('kbox status')
  .ok(callback)
  .expect('up\n')
  .ok(done)
  */

  var api;

  var get = function() {
    
  };

  var run = function(cmd) {

    api.cmd = cmd;
    
  };

  var wait = function() {
    // How to wait on promise?
  };

  var ok = function() {
    
    

  };

  api = {
    cmd: cmd,
    ok: ok,
    run: run
  };

  return api;

};
