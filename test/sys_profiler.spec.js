'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var sp = rewire('../lib/sys_profiler.js');

var TIMEOUT = 45 * 1000;

var PLATFORM_OSX = 'darwin';
var PLATFORM_WINDOWS = 'win32';
var PLATFORM_LINUX = 'linux';

describe('#process.platform', function() {
  it('should be an expected value.', function() {
    var expectedPlatforms = [
      PLATFORM_OSX,
      PLATFORM_LINUX,
      PLATFORM_WINDOWS
    ];
    var platform = process.platform;
    expect(expectedPlatforms).to.contain(process.platform);
  });
});

// Only run these unit tests if we are on OSX.
if (process.platform === PLATFORM_OSX) {

  describe('sys_profiler.js', function() {

    describe('#getAppData()', function() {

      it('should return system profile application data.', function(done) {
        this.timeout(TIMEOUT);
        var expected = 'Applications:';
        sp.getAppData(function(err, data) {
          var match = data.match(/^(.*)\n/);
          var result = match && match[1] ? match[1] : data.substring(0, 1024);
          expect(err).to.equal(null);
          expect(result).to.equal(expected);
          done();
        });
      });

      it('should return an applications data, when an app arg is passed.', function(done) {
        this.timeout(TIMEOUT);
        var expected = 'SystemUIServer';
        sp.getAppData('SystemUIServer', function(err, data) {
          data = data.substring(0, 1024);
          expect(err).to.equal(null);
          expect(data).to.equal(expected);
          done();
        });
      });

      it('should return null when an uninstalled app arg is passed.', function(done) {
        this.timeout(TIMEOUT);
        var expected = null;
        sp.getAppData('FakeNotInstalledApp', function(err, data) {
          if (data) {
            data = data.substring(0, 1024);
          }
          expect(err).to.equal(null);
          expect(data).to.equal(expected);
          done();
        });
      });

    });

    describe('#isAppInstalled()', function() {

      var test = function(desc, input, expected) {
        it(desc, function(done) {
          this.timeout(TIMEOUT);
          sp.isAppInstalled(input, function(err, isInstalled) {
            expect(err).to.equal(null);
            expect(isInstalled).to.equal(expected);
            done();
          });
        });
      };

      test('should return TRUE when an app is installed.',
        'SystemUIServer',
        true
      );
      test('should return TRUE when an app is installed, and be case insenitive.',
        'sYsteMuiseRver',
        true
      );
      test('should return FALSE when an app is NOT installed.',
        'FakeNotInstalledApp',
        false
      );

    });

  });

}
