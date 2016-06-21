'use strict';
/* global ngMidwayTester */


describe('Kalabox Angular app', function () {
  var tester;

  /**
   * Remove after each test.
   */

  afterEach(function () {
    tester.destroy();
    tester = null;
  });

  beforeEach(function() {
    module('app', 'templates');
    tester = ngMidwayTester('app');
  });
  it('redirects paths to "/installer"', function (done) {
    tester.visit('/', function() {
      expect(tester.path()).to.equal('/installer');
      done();
    });
  });
});
