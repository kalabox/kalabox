'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var firewall = rewire('../lib/firewall.js');

describe('firewall.js', function() {

  describe('#isBlockingAll()', function() {

    it('should return false.', function(done) {
      var expected = false;
      firewall.isBlockingAll(function(err, isBlockingAll) {
        expect(err).to.equal(null);
        expect(isBlockingAll).to.equal(expected);
        done();
      });
    });

  });

});
