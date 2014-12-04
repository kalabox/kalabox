'use strict';

var chai = require('chai'),
  assert = chai.assert,
  expect = chai.expect,
  sinon = require('sinon'),
  rewire = require('rewire'),
  internet = rewire('../lib/internet.js');

describe('internet.js', function () {

  describe('#check()', function () {
  
    it('should NOT return an error when a site is reachable.', function (done) {
      this.timeout(10 * 1000);
      internet.check('www.google.com', function (err) {
        expect(err).to.equal(null);
        done();
      });
    });

    it('should return an error when a site in unreachable.', function (done) {
      this.timeout(10 * 1000);
      internet.check('www.fake-sites-are-not-reachable.com', function (err) {
        expect(err).to.not.equal(null);
        done();
      });
    });

  });

});
