'use strict';

var expect = require('chai').expect;

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
