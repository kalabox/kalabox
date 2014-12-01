'use strict';

var deps = require('../lib/deps.js');
var b2d = require('../lib/b2d.js');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var sinon = require('sinon');

describe('#b2d module', function() {

  var fakeShell = {
    exec: function() {}
  };
  var sandbox = sinon.sandbox.create();
  //deps.register('shell', fakeShell);

  afterEach(function() {
    sandbox.restore();
  });

  describe('#isInstalled()', function(done) {

    it('should return TRUE when b2d is installed.', function(done) {
      var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
        expect(cmd).to.equal('which boot2docker');
        callback(null, '/usr/local/bin/boot2docker\n');
      });
      deps.override({shell:fakeShell}, function() {
        b2d.isInstalled(function(err, isInstalled) {
          expect(err).to.equal(null);
          expect(isInstalled).to.equal(true);
          done();
        });
      });
    });

    it('should return FALSE when b2d is NOT installed.', function(done) {
      var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
        expect(cmd).to.equal('which boot2docker');
        callback(null, null);
      });
      deps.override({shell:fakeShell}, function() {
        b2d.isInstalled(function(err, isInstalled) {
          expect(err).to.equal(null);
          expect(isInstalled).to.equal(false);
          done();
        });
      });
    });

  });

  ['down', 'up'].forEach(function(action) {
    describe('#' + action + '()', function() {
      it('should run the correct shell command.', function(done) {
        var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
          callback(null, null);
        });
        deps.override({shell:fakeShell}, function() {
          b2d[action](function() {
            sinon.assert.callCount(stub, 2);
            sinon.assert.calledWithExactly(stub, 'which boot2docker', sinon.match.func);
            sinon.assert.calledWithExactly(stub, 'boot2docker ' + action, sinon.match.func);
            done();
          });
        });
      });
    });
  });

  describe('#status()', function() {
    it('should return the correct status.', function(done) {
      var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
        callback(null, 'running\n');
      });
      deps.override({shell:fakeShell}, function() {
        b2d.status(function(status) {
          expect(status).to.equal('running');
          done();
        });
      });
    });
  });

  describe('#ip()', function() {
    it('should return the b2d ip address.', function(done) {
      var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
        callback(null, '\nThe VM\'s Host only interface IP address is: \n\n1.3.3.7\n');
      });
      this.timeout(60 * 1000);
      deps.override({shell:fakeShell}, function() {
        b2d.ip(function(err, ip) {
          expect(err).to.equal(null);
          expect(ip).to.equal('1.3.3.7');
          done();
        });
      });
    });
  });

});
