'use strict';

var assert = require('chai').assert,
  expect = require('chai').expect,
  sinon = require('sinon'),
  rewire = require('rewire'),
  firewall = rewire('../lib/firewall.js');

describe('firewall.js', function () {
  
  describe('#isBlockingAll()', function () {

    it('should return false.', function (done) {
      var expected = false;
      firewall.isBlockingAll(function (err, isBlockingAll) {
        expect(err).to.equal(null);
        expect(isBlockingAll).to.equal(expected);
        done();
      });
    });

  });

});
