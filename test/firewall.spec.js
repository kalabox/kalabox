'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var firewall = rewire('../lib/util/firewall.js');
var platformSpec = require('./platform.spec.js');

// Only run these OSX specific tests, if unit test are running on OSX.
platformSpec.assertExpectedPlatform();
if (process.platform === platformSpec.PLATFORM_OSX) {

  describe('firewall.js', function() {

    describe('#isOkay()', function() {

      it('should return true.', function(done) {
        var expected = true;
        return firewall.isOkay()
        .then(function(isOkay) {
          expect(isOkay).to.equal(expected);
        })
        .nodeify(done);
      });

    });

  });

}
