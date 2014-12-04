'use strict';

var expect = require('chai').expect;

var PLATFORM_OSX = 'darwin';
var PLATFORM_WINDOWS = 'win32';
var PLATFORM_LINUX = 'linux';

var PLATFORMS = [
  PLATFORM_OSX,
  PLATFORM_LINUX,
  PLATFORM_WINDOWS
];

var platform = process.platform;

var assertExpectedPlatform = function() {
  expect(PLATFORMS).to.contain(platform);
};

describe('#process.platform', function() {
  it('should be an expected value.', function() {
    expect(PLATFORMS).to.contain(platform);
  });
});

module.exports.PLATFORMS = PLATFORMS;

module.exports.PLATFORM_OSX = PLATFORM_OSX;

module.exports.PLATFORM_LINUX = PLATFORM_LINUX;

module.exports.PLATFORM_WINDOWS = PLATFORM_WINDOWS;

module.exports.assertExpectedPlatform = assertExpectedPlatform;

module.exports.ifOsx = function(callback) {
  callback();
};
