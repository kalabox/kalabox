'use strict';

var chai = require('chai');
var expect = chai.expect;
var rewire = require('rewire');
var _require = require('../lib/require.js');
var events = require('../lib/core/events');
//var deps = rewire('../lib/core/deps');
var deps = require('../lib/core/deps');
//var testUtil = require('../lib/testUtil.js');
//deps.__set__('events', events);

describe.skip('require.js', function() {

  var globalConfig = {
    kalaboxRoot: 'foo',
    srcRoot: 'foo'
  };

  var kbox = {
    id: 'abcd1234',
    core: {
      deps: deps,
      events: events
    }
  };

  /*describe('#resolve', function() {

    var mockFs = null;

    var mockFsOpts = {
      'kalabox': {
        'plugins': {
          'foo': 'foo plugin code'
        }
      }
    };

    before(function() {
      kbox.core.deps.register('globalConfig', globalConfig);
      mockFs = testUtil.mockFs.create(mockFsOpts);
    });

    after(function() {
      mockFs.restore();
    });

    it('should find node modules.', function() {
      var filepath = _require.resolve(kbox, 'foo');
      expect(filepath).to.not.equal(null);
    });

  });*/

  describe('#require', function() {

    kbox.core.deps.register('globalConfig', globalConfig);
    console.log('afasdfdf');

    before(function() {
      //console.log('afasdfdf');
      //kbox.core.deps.register('globalConfig', globalConfig);
    });

    it('should load a normal module correctly.', function() {
      var module = _require.require(kbox, './require-a.js');
      expect(typeof module).to.equal('object');
      expect(module.foo()).to.equal('12345');
    });

    it('should load a module function with no args correctly.', function() {
      var module = _require.require(kbox, './require-b');
      expect(typeof module).to.equal('function');
      expect(module().id).to.equal('aabbcc');
    });

    it('should load a module with kbox as a arg.', function() {
      var module = _require.require(kbox, './require-c');
      expect(typeof module).to.equal('object');
      expect(typeof module.test).to.equal('function');
      expect(module.test()).to.equal(kbox.id);
    });

    it('should handle a module using app correctly.', function(done) {
      var module1 = _require.require(kbox, './require-d');
      var module2 = _require.require(kbox, './require-d');
      expect(typeof module1).to.equal('object');
      expect(typeof module2).to.equal('object');
      expect(module1.loaded).to.equal(false);
      expect(module2.loaded).to.equal(false);
      kbox.core.deps.register('app', {name:'elvis'}, function() {
        expect(module1.loaded).to.equal(true);
        expect(module2.loaded).to.equal(true);
        expect(module1.test()).to.equal('elvis');
        expect(module2.test()).to.equal('elvis');
        done();
      });
    });

    it('should load a legacy module correctly.', function() {
      kbox.core.deps.register('a', 'a');
      kbox.core.deps.register('b', 'b');
      kbox.core.deps.register('c', 'c');
      var module = _require.require(kbox, './require-e');
      expect(typeof module).to.equal('object');
      expect(module.test()).to.equal('a-b-c');
    });

  });

});
