'use strict';

var expect = require('chai').expect;
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

});
