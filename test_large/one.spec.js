'use strict';

var shell = require('shelljs');
var chai = require('chai');
var expect = chai.expect;
var Promise = require('bluebird');

function CliTest() {
  this.data = null;
  this.code = null;
  this.error = null;
  this._json = null;
  return this;
}

CliTest.prototype.options = function() {
  return {silent:true};
};

CliTest.prototype.run = function(cmd, callback) {
  if (Array.isArray(cmd)) {
    cmd = cmd.join(' ');
  }
  var self = this;
  shell.exec(cmd, self.options(), function(code, data) {
    if (code !== 0) {
      self.error = new Error(data);
    }
    self.code = code;
    self.data = data;
    callback(self);
  });
};

CliTest.prototype.json = function() {
  var self = this;
  if (!self._json) {
    self._json = JSON.parse(self.data);
  }
  return self._json;
};

CliTest.prototype.runSuccess = function(cmd, callback) {
  var self = this;
  self.run(cmd, function(code, data) {
    expect(self.error).to.equal(null);
    callback.apply(self, []);
  });
};

describe('My first functional test!', function() {

  describe('test one', function() {

    it('should have the correct console log level.', function(done) {
      this.timeout(30 * 1000);
      var cmd = ['kbox', 'config'];
      new CliTest().runSuccess(cmd, function() {
        expect(this.json().logLevelConsole).to.equal('info');
        done();
      });
    });

    describe('install', function() {

      it('should not be already installed.', function(done) {
        this.timeout(120 * 1000);
        new CliTest().runSuccess(['kbox', 'containers'], function() {
          expect(this.data).to.not.match(/drupal7/);
          done();
        });
      });

      it('should install correctly.', function(done) {
        this.timeout(120 * 1000);
        new CliTest().runSuccess(['kbox', 'drupal7', 'install'], function() {
          done();
        });
      });

      it('should uninstall correctly.', function(done) {
        this.timeout(120 * 1000);
        new CliTest().runSuccess(['kbox', 'drupal7', 'uninstall'], function() {
          done();
        });
        
      });

    });

  });

});
