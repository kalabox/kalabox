'use strict';

var kbox = require('../lib/kbox.js');
var core = kbox.core;
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var testUtil = require('../lib/testUtil.js');

describe('config module', function() {

  before(function() {
    var globalConfig = core.config.getGlobalConfig();
    core.deps.register('globalConfig', globalConfig);
    core.deps.register('verbose', false);
    core.log.init({consoleOnly:true});
  });

  describe('#normalizeValue()', function() {
    it('should normalize values correctly.', function() {
      var config = {
        bar: 'xx:foo:xx',
        foo: 'asdf'
      };
      config = core.config.normalize(config);
      var result = core.config.normalizeValue(config, 'aaa:bar:bbb');
      expect(result).to.equal('aaaxxasdfxxbbb');
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
    // @todo: implement this!
    it.skip('should normalize a nested object correctly.', function() {
      var config = {
        bar: 'Y',
        foo: {
          bazz: 'X:bar:Z'
        }
      };
      core.config.normalize(config);
      expect(config.foo.bazz).to.equal('XYZ');
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
    it('should sort keys after each mixin.', function() {
      var configA = {
        c: 'ccc'
      };
      var configB = {
        a: 'aaa',
        x: 'xxx'
      };
      var expected = {
        a: 'aaa',
        c: 'ccc',
        x: 'xxx'
      };
      var result = core.config.mixIn(configA, configB);
      var keysResult = Object.keys(result);
      var keysExpected = Object.keys(expected);
      for (var i = 0; i < keysResult.length; ++i) {
        expect(keysResult[i]).to.equal(keysExpected[i]);
      }
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
      //expect(globalConfig).to.have.property('someSetting1', 'green');
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
      //expect(appConfig).to.have.property('someSetting1', 'green');
      expect(appConfig).to.have.property('someSetting2', '5.34');
      mockFs.restore();
    });
  });

});
