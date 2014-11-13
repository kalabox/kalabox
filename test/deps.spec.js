'use strict';

var deps = require('../lib/deps.js');
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

    it('should NOT throw an error when a dependency is NOT found, but is optional.', function() {
      var key = 'somekey';
      var expected = null;
      var opts = {optional:true};
      var result = deps.lookup(key, opts);
      expect(result).to.equal(expected);
    });

  });

  describe('#contains()', function() {

    it('should return a true/false of if dep is contained.', function() {
      var key = 'aliens';
      expect(deps.contains(key)).to.equal(false);
      deps.register(key, 'take me to your leader');
      expect(deps.contains(key)).to.equal(true);
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
