'use strict';

var kbox = require('../lib/kbox.js');
var core = kbox.core;
var chai = require('chai');
var expect = chai.expect;
var testUtil = require('../lib/testUtil.js');

describe('config module', function() {

  describe('#normalizeValue()', function() {
    it('should normalize values correctly.', function() {
      var config = {
        bar: 'xx:foo:xx',
        foo: 'asdf'
      };
      var key = 'bar';
      core.config.normalizeValue(key, config);
      expect(config.bar).to.equal('xxasdfxx');
    });
  });

  describe('#normalize()', function() {
    it('should normalize a config correctly.', function() {
      var config = {
        bar: 'A',
        foo: ':bar:B',
        bazz: ':foo:C'
      };
      core.config.normalize(config);
      expect(config.bazz).to.equal('ABC');
    });
  });

  describe('#mixIn()', function() {
    it('should merge and override values correctly.', function() {
      var configA = {
        a: 'aaa',
        b: 'bbb'
      };
      var configB = {
        a: 'aaaa',
        c: '<<:b:>>'
      };
      var expected = {
        a: 'aaaa',
        b: 'bbb',
        c: '<<bbb>>'
      };
      core.config.mixIn(configA, configB);
      expect(configA).to.deep.equal(expected);
    });
  });

  describe('#getEnvConfig()', function() {
    it('should return an expected env config object.', function() {
      var envConfig = core.config.getEnvConfig();
      expect(envConfig).to.have.property('home');
    });
  });

  describe('#getGlobalConfig()', function() {
    it('should return an expected global config object.', function() {
      var mockFs = testUtil.mockFs.create();
      var globalConfig = core.config.getGlobalConfig();
      expect(globalConfig).to.have.property('home');
      expect(globalConfig).to.have.property('appsRoot');
      expect(globalConfig).to.have.property('someSetting1', 'green');
      mockFs.restore();
    });
  });

  describe('#getAppConfig()', function() {
    it('should return an expected app config object.', function() {
      var mockFs = testUtil.mockFs.create();
      var fakeApp = {
        name: 'myapp54'
      };
      var appConfig = core.config.getAppConfig(fakeApp);
      expect(appConfig).to.have.property('home');
      expect(appConfig).to.have.property('appsRoot');
      expect(appConfig).to.have.property('someSetting1', 'green');
      expect(appConfig).to.have.property('someSetting2', '5.34');
      mockFs.restore();
    });
  });

});
