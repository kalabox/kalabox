'use strict';

var _ = require('lodash');
var shell = require('shelljs');
var Promise = require('bluebird');
Promise.longStackTraces();

/*
 * Init an instance of krun.
 */
module.exports = function(silent) {

  // Default options.
  if (!silent) {
    silent = false;
  }

  // Declare api so it can be returned in functions for chaining.
  var api;

  /*
   * Run cmd in a shell with an optional timeout.
   */
  var run = function(cmd, timeout) {

    // Default timeout.
    if (!timeout) {
      timeout = 30;
    }
    timeout = timeout * 1000;

    // Handler.
    var fn = function(fulfill, reject) {

      api.cmd = cmd;

      shell.exec(api.cmd, {silent:silent}, function(code, output) {

        console.log('cmd -> ' + api.cmd);

        api.code = code;
        api.output = output;

        fulfill();

      });
      
    };

    if (api.p) {

      // Instance already has a promise, so chain them.
      api.p = api.p.then(function() {
        return new Promise(fn).timeout(timeout, 'timeout: ' + cmd);
      });

    } else {

      // Instance does not already have a promise.
      api.p = new Promise(fn).timeout(timeout, 'timeout: ' + cmd);

    }

    // Return api.
    return api;
    
  };

  /*
   * Reject promise chain if return code was non zero. 
   */
  var ok = function() {
    
    // Chain promise.
    api.p = api.p.then(function() {

      // If non zero return code, reject promise chain.
      if (api.code !== 0) {
        var details = {
          cmd: api.cmd,
          code: api.code,
          output: api.output
        };
        var err = new Error(JSON.stringify(details, null, '  '));
        return Promise.reject(err);
      }

    });

    // Return api.
    return api;

  };

  /*
   * Reject promise chain if returned output does not match what was expected.
   */
  var expect = function(expected) {

    // Chain promise.
    api.p = api.p.then(function() {

      // If output doesn't match, reject promise chain.
      if (api.output !== expected) {
        var details = {
          cmd: api.cmd,
          expected: expected,
          actual: api.output
        };
        var err = new Error(JSON.stringify(details, null, '  '));
        return Promise.reject(err);
      }
      
    });

    // Return api.
    return api;
    
  };

  /*
   * Pause promise chain while an async function is called.
   */
  var call = function(cb) {

    // Chain promise.
    api.p = api.p.then(function() {

      // Create a new promise fulfilled by callback function.
      return new Promise(function(fulfill, reject) {

        // Call callback function with api as this.
        cb.call(api, function(err) {

          if (err) {

            // Reject.
            reject(err);
              
          } else {

            // Fulfill.
            fulfill();

          }

        });

      });

    });

    // Return api.
    return api;
    
  };

  /*
   * End promise chain and report rejects.
   */
  var done = function(cb) {

    // Cap the promise chain, and report to callback.
    api.p = api.p.then(cb, cb);

    // Do not return api, since this ends the promise chain.

  };

  // Build api.
  api = {
    call: call,
    cmd: null,
    code: null,
    done: done,
    expect: expect,
    ok: ok,
    output: null,
    p: null,
    run: run
  };

  // Return api.
  return api;

};
