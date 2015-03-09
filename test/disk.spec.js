'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var disk = rewire('../lib/util/disk.js');
var core = require('../lib/core.js');

describe('disk.js', function() {

  before(function() {
    var globalConfig = core.config.getGlobalConfig();
    core.deps.registerIf('globalConfig', globalConfig);
  });

  describe('#getTempDir()', function() {

    it('should return the correct temp dir.', function() {
      var result = disk.getTempDir();
      expect(result).to.match(/.*\/.kalabox\/downloads/);
    });

  });

  describe('#getFreeSpace()', function() {

    it('should return a number greater than zero.', function(done) {
      disk.getFreeSpace(function(err, freeSpace) {
        expect(err).to.be.equal(null);
        expect(freeSpace).to.be.a('number');
        expect(freeSpace).to.be.above(0);
        done();
      });
    });

    var fnTest = function(check, verify) {
      var fakeDiskspace = {
        check: function() {}
      };
      var stub = sinon.stub(fakeDiskspace, 'check', check);

      disk.__with__({
        diskspace: fakeDiskspace
      })(function() {
        disk.getFreeSpace(function(err, freespace) {
          verify(err, freespace);
        });
      });
    };

    it('should properly convert bytes to mbytes.', function(done) {
      this.timeout(20 * 1000);
      var check = function(volume, callback) {
        callback(null, null, 5242880, 'READY');
      };
      fnTest(check, function(err, freespace) {
        expect(err).to.equal(null);
        expect(freespace).to.be.a('number');
        expect(freespace).to.equal(5);
        done();
      });
    });

    it('should properly return an error.', function(done) {
      this.timeout(20 * 1000);
      var check = function(volume, callback) {
        callback(null, null, 0, 'NOTFOUND');
      };
      fnTest(check, function(err, freespace) {
        expect(err).to.not.equal(null);
        expect(freespace).to.equal(0);
        done();
      });
    });

  });

});
