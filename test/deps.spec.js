'use strict';

var kbox = require('../lib/kbox.js');
var deps = kbox.core.deps;
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

describe('#deps module', function() {

  beforeEach(function() {
    deps.clear();
  });

  describe('#register()', function() {

    it('should register a task correctly.', function() {
      var key = 'key';
      var expected = 'value';
      deps.register(key, expected);
      var result = deps.lookup(key);
      expect(result).to.equal(expected);
    });

    it(
      'should throw an error when registering a dep that is already ' +
      'registered.',
      function() {
        var key = 'donut';
        var value = 'jelly';
        deps.register(key, value);
        var fn = function() {
          deps.register(key, value);
        };
        var expectedMsg =
          'Tried to register a dependency "donut" that was already registered.';
        expect(fn).to.throw(Error, expectedMsg);
      }
    );

  });

  describe('#lookup()', function() {

    it('should throw error when dependency is NOT found.', function() {
      var key = 'mydependency';
      var fn = function() {
        var result = deps.lookup(key);
        assert.fail('This should never be reachable!');
      };
      expect(fn).to.throw(Error, 'The dependency "' + key + '" was NOT found!');
    });

    it(
      'should NOT throw an error when a dependency is NOT found, but is ' +
      'optional.',
      function() {
        var key = 'somekey';
        var expected = null;
        var opts = {optional:true};
        var result = deps.lookup(key, opts);
        expect(result).to.equal(expected);
      }
    );

  });

  describe('#contains()', function() {

    it('should return a true/false of if dep is contained.', function() {
      var key = 'aliens';
      expect(deps.contains(key)).to.equal(false);
      deps.register(key, 'take me to your leader');
      expect(deps.contains(key)).to.equal(true);
    });

  });

  describe('#remove()', function() {
    it('should remove a specific dependency.', function() {
      var key = 'oscar';
      var value = 'the grouch';
      expect(deps.contains(key)).to.equal(false);
      deps.register(key, value);
      expect(deps.contains(key)).to.equal(true);
      deps.remove(key);
      expect(deps.contains(key)).to.equal(false);
    });
  });

  describe('#clear()', function() {

    it('should remove all dependencies.', function() {
      var key = 'trashCan';
      var value = 'garbage';
      expect(deps.contains(key)).to.equal(false);
      deps.register(key, value);
      expect(deps.contains(key)).to.equal(true);
      expect(deps.lookup(key)).to.equal(value);
      deps.clear();
      expect(deps.contains(key)).to.equal(false);
    });

  });

  describe('#inspect()', function() {

    it(
      'should return an array of dependencies required by a function.',
      function() {
        var fn = function(alpha, bravo, charlie, delta) {};
        var result = deps.inspect(fn);
        var expected = ['alpha', 'bravo', 'charlie', 'delta'];
        expect(result).to.deep.equal(expected);
      }
    );

  });

  describe('#override()', function() {

    it(
      'should override a dependency for the life of the callback.',
      function(done) {
        var key = 'mode';
        var modeDev = 'dev';
        var modeProd = 'prod';
        deps.register(key, modeDev);
        expect(deps.lookup(key)).to.equal(modeDev);
        deps.override({mode:modeProd}, function(next) {
          expect(deps.lookup(key)).to.equal(modeProd);
          next();
          done();
        });
        expect(deps.lookup(key)).to.equal(modeDev);
      }
    );

    it(
      'should work properly within nested called to override.',
      function(done1) {
        var key = 'foo';
        var getValue = function() { return deps.lookup(key); };
        deps.register(key, 'A');
        expect(getValue()).to.equal('A');
        deps.override({foo:'B'}, function(done2) {
          expect(getValue()).to.equal('B');
          deps.override({foo:'C'}, function(done3) {
            expect(getValue()).to.equal('C');
            done3();
            expect(getValue()).to.equal('B');
            done2();
            expect(getValue()).to.equal('A');
            done1();
          });
        });
      }
    );
  });

  describe('#call()', function() {

    it('should automatically set dependencies.', function() {
      deps.register('color', 'red');
      deps.register('country', 'US');
      deps.register('count', 7);
      deps.register('regexp', /mchammer/);
      deps.call(function(color, country, count, regexp) {
        expect(color).to.equal('red');
        expect(country).to.equal('US');
        expect(count).to.equal(7);
        expect(regexp).to.deep.equal(/mchammer/);
      });
    });

    it('should return what the callback returns.', function() {
      var result = deps.call(function() {
        return 'foo';
      });
      expect(result).to.equal('foo');
    });

    it(
      'should work if a callback with zero arguments is used.',
      function(done) {
        deps.call(function() {
          done();
        });
      }
    );

    it('should throw an error when a dependency is NOT found.', function() {
      var fn = function() {
        deps.call(function(dbCooper) {
          assert.fail('Should be unreachable.');
        });
      };
      expect(fn).to.throw(Error, 'The dependency "dbCooper" was NOT found!');
    });

  });

});
