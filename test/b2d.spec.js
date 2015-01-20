'use strict';

var kbox = require('../lib/kbox.js');
var deps = kbox.core.deps;
var env = kbox.core.env;
var b2d = require('../lib/engine/provider/b2d.js');
var testUtil = require('../lib/testUtil.js');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var path = require('path');
var sinon = require('sinon');

describe.skip('#b2d module', function() {

  var fakeShell = {
    exec: function() {}
  };

  var fakeConfig = {
    sysConfRoot: path.join(env.getHomeDir(), '.kalabox')
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

  describe('#hasProfile()', function(done) {

    it('Should return true if a file exists.', function(done) {
      var config = {
        '.kalabox' : {
          'b2d.profile': ''
        }
      };
      var mockFs = testUtil.mockFs.create(config);
      deps.override({config:fakeConfig}, function() {
        b2d.hasProfile(function(hasProfile) {
          expect(hasProfile).to.equal(true);
          mockFs.restore();
          done();
        });
      });
    });

    it('Should return false if a file does not exists.', function(done) {
      var config = {
        '.kalabox' : {}
      };
      var mockFs = testUtil.mockFs.create(config);
      deps.override({config:fakeConfig}, function() {
        b2d.hasProfile(function(hasProfile) {
          expect(hasProfile).to.equal(false);
          mockFs.restore();
          done();
        });
      });
    });

  });

  ['down', 'up'].forEach(function(action) {
    describe('#' + action + '()', function() {
      it('should run the correct shell command.', function(done) {
        var config = {
          '.kalabox' : {
            'b2d.profile': ''
          }
        };
        var mockFs = testUtil.mockFs.create(config);
        var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
          callback(null, true);
        });
        deps.override({shell:fakeShell, config:fakeConfig}, function() {
          b2d[action](3, function() {
            sinon.assert.callCount(stub, 2);
            sinon.assert.calledWithExactly(
              stub, 'which boot2docker', sinon.match.func
            );
            sinon.assert.calledWithExactly(
              stub, 'boot2docker ' + action, sinon.match.func
            );
            mockFs.restore();
            done();
          });
        });
      });
    });
  });

  describe('#init()', function() {
    it('should run the correct shell command.', function(done) {
      var config = {
        '.kalabox' : {
          'b2d.profile': ''
        }
      };
      var mockFs = testUtil.mockFs.create(config);
      var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
        callback(null, true);
      });
      deps.override({shell:fakeShell, config:fakeConfig}, function() {
        b2d.init(3, function() {
          sinon.assert.callCount(stub, 2);
          sinon.assert.calledWithExactly(
            stub, 'which boot2docker', sinon.match.func
          );
          sinon.assert.calledWithExactly(
            stub, 'boot2docker init', sinon.match.func
          );
          mockFs.restore();
          done();
        });
      });
    });
  });

  describe('#state()', function() {
    it('should return the correct status.', function(done) {
      var config = {
        '.kalabox' : {
          'b2d.profile': ''
        }
      };
      var mockFs = testUtil.mockFs.create(config);
      var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
        callback(null, 'running\n');
      });
      deps.override({shell:fakeShell, config:fakeConfig}, function() {
        b2d.state(3, function(message) {
          expect(message).to.equal('running');
          mockFs.restore();
          done();
        });
      });
    });
  });

  describe('#ip()', function() {
    it('should return the b2d ip address.', function(done) {
      var config = {
        '.kalabox' : {
          'b2d.profile': ''
        }
      };
      var mockFs = testUtil.mockFs.create(config);
      var stub = sandbox.stub(fakeShell, 'exec', function(cmd, callback) {
        callback(null, '1.3.3.7');
      });
      this.timeout(60 * 1000);
      deps.override({shell:fakeShell, config:fakeConfig}, function() {
        b2d.ip(3, function(err, ip) {
          expect(err).to.equal(null);
          expect(ip).to.equal('1.3.3.7');
          mockFs.restore();
          done();
        });
      });
    });
  });

});
