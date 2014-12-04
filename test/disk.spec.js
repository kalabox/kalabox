'use strict';

var assert = require('chai').assert,
  expect = require('chai').expect,
  sinon = require('sinon'),
  rewire = require('rewire'),
  disk = rewire('../lib/disk.js');

describe('disk.js', function () {

  describe('#getTempDir()', function () {

    it('should return the correct temp dir.', function () {
      var expected = '/tmp',
      result = disk.getTempDir();
      expect(result).to.equal(expected);
    });

  });

  describe('#getFreeSpace()', function () {

    it('should return a number greater than zero.', function (done) {
      disk.getFreeSpace(function (err, freeSpace) {
        expect(err).to.be.equal(null);
        expect(freeSpace).to.be.a('number');
        expect(freeSpace).to.be.above(0);
        done();
      });
    });

    var fn_test = function (check, verify) {
      var fake_diskspace = {
        check: function () {}
      },
      stub = sinon.stub(fake_diskspace, 'check', check);

      disk.__with__({
        diskspace: fake_diskspace
      })(function () {
        disk.getFreeSpace(function (err, freespace) {
          verify(err, freespace);
        });
      });
    };

    it('should properly convert bytes to mbytes.', function (done) {
      this.timeout(20 * 1000);
      var check = function (volume, callback) {
        callback(null, null, 5242880, 'READY');
      };
      fn_test(check, function (err, freespace) {
        expect(err).to.equal(null);
        expect(freespace).to.be.a('number');
        expect(freespace).to.equal(5);
        done();
      });
    });

    it('should properly return an error.', function (done) {
      this.timeout(20 * 1000);
      var check = function (volume, callback) {
        callback(null, null, 0, 'NOTFOUND');
      };
      fn_test(check, function (err, freespace) {
        expect(err).to.not.equal(null);
        expect(freespace).to.equal(0);
        done();
      });
    });

  });

});
