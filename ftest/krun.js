'use strict';

var Promise = require('bluebird');
var VError = require('verror');
var _ = require('lodash');
var pp = require('util').inspect;
var shell = require('shelljs');

/*
 * Constructor, can be used with or without new operator.
 */
function Krun(opts) {

  opts = opts || {silent: true};

  if (this instanceof Krun) {
    // Called with the new operator.
    this.cmd = null;
    this.p = Promise.resolve();
    this.silent = true;
  } else {
    // Called without the new operator.
    return new Krun(opts);
  }

}

/*
 * Append to promise and bind to this instance.
 */
Krun.prototype.chain = function(fn) {

  var self = this;

  // Append to promise.
  self.p = self.p.then(function(result) {
    return fn.apply(self);
  });

  // Return for chaining.
  return self;

};

Krun.prototype.call = function(fn, cb) {

  var self = this;

  self.p = self.p.then(function() {
    var context = fn.call(self);
    if (cb) {
      return cb.call(self, context);
    } else {
      return context;
    }
  });

  if (cb) {
    return self;
  } else {
    return self.p;
  }

};

/*
 * Run a shell command.
 */
Krun.prototype.run = function(cmd, timeout) {

  if (_.isArray(cmd)) {
    cmd = cmd.join(' ');
  }

  return this.chain(function() {

    // Argument processing.
    timeout = timeout || 30;

    // Convert from seconds to miliseconds.
    timeout = timeout * 1000;

    // Save for later.
    var self = this;

    // Set cmd property.
    self.cmd = cmd;

    // Execute shell command and store code and output for later.
    return Promise.fromNode(function(cb) {
      var opts = {
        silent: false,
        async: true
      };
      console.log('CMD => ' + self.cmd);
      shell.exec(self.cmd, opts, function(code, output) {
        self.code = code;
        self.output = output;
        cb();
      });
    })
    // Give execution a timeout.
    .timeout(timeout)
    // Wrap timeout errors.
    .catch(Promise.TimeoutError, function(err) {
      throw new Error('Timeout running command: ' + cmd);
    });
    
  });

};

/*
 * Ensure command that has been run returns a non-zero error code.
 */
Krun.prototype.ok = function() {

  return this.chain(function() {

    // Save for later.
    var self = this;

    // Throw an error if last run had a non-zero error code.
    if (self.code !== 0) {
      var details = {
        cmd: self.cmd,
        code: self.code,
        output: self.output
      };
      throw new Error(pp(details));
    }

  });

};

/*
 * Ensure last command output equals given string.
 */
Krun.prototype.expect = function(expected) {

  return this.chain(function() {

    // Save for later.
    var self = this;

    // Throw error is output is not equal to expected.
    if (self.output !== expected) {
      var details = {
        cmd: self.cmd,
        expected: expected,
        actual: self.output 
      };
      throw new Error(pp(details));
    }

  });

};

/*
 * Call a function bound to this instance.
 */
Krun.prototype.then = function(fn) {

  return this.chain(fn);

};

Krun.prototype.json = function(fn) {

  var self = this;

  return self.call(function() {
    return JSON.parse(self.output);
  }, fn);
  
};

Krun.prototype.promise = function() {
  return this.p;
};

/*
 * Close off chain and report error or result to callback function.
 */
Krun.prototype.done = function(cb) {
 
  self.p.nodeify(cb);

};

module.exports = Krun;
