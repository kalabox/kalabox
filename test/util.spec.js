'use strict';

var util = require('../lib/util.js');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
var testUtil = require('../lib/testUtil.js');
var _path = require('path');

describe('util', function() {

  describe('#name module', function() {

    describe('#delim', function() {
      var expectedDelim = '_';
      it('Should be set to "' + expectedDelim + '"', function() {
        assert(util.name.delim === expectedDelim);
      });
    });

    describe('#create()', function() {
      it('Should return a string with the expected value.', function() {
        var fn = function(parts, expected) {
          var result = util.name.create(parts);
          expect(result).to.equal(expected);
        };
        fn(['foo', 'bar', 'bazz'], 'foo_bar_bazz');
        fn(['a1', 'b2', 'c3'], 'a1_b2_c3');
        fn(['abc'], 'abc');
      });
    });

    describe('#parse()', function() {
      it('Should return an array with the proper parsed values.', function() {
        var fn = function(name, expected) {
          var result = util.name.parse(name);
          expect(result).to.deep.equal(expected);
        };
        fn('this_is_a_test', ['this', 'is', 'a', 'test']);
        fn('unit-tests_are_cool', ['unit-tests', 'are', 'cool']);
      });
      it('Should return null when it parses an invalid name.', function() {
        var inputs = [
          'InvalidName',
          '_',
          '$$$$'
        ];
        inputs.forEach(function(input) {
          expect(util.name.parse(input)).to.be.equal(null, input);
        });
      });
    });

    describe('#isValidPart()', function() {
      var iter = function(inputs, expected) {
        expect(inputs.length).to.be.above(1);
        inputs.forEach(function(input) {
          expect(util.name.isValidPart(input)).to.be.equal(expected, input);
        });
      };
      it('Should return true when part is valid.', function() {
        var inputs = [
          'foo7',
          'bar3',
          'bob'
        ];
        iter(inputs, true);
      });
      it('Should return false when part is NOT valid.', function() {
        var inputs = [
          '7foo',
          '_dog',
          'cat_bird',
          'AAA'
        ];
        iter(inputs, false);
      });
    });

    describe('#validatePart()', function() {
      var iterAsciiChars = function(fnFilter, fnTest) {
        for (var i = 0; i < 127; ++i) {
          var str = String.fromCharCode(i);
          if (fnFilter(str)) {
            fnTest('abc' + str);
          }
        }
      };
      var regexFilter = /[a-z0-9\-]/;

      it(
        'Should NOT throw an error when valid characters are used.',
        function() {

          var fn = function(key) {
            expect(function() {
              util.name.create([key]);
            }).to.not.throw(Error);
          };

          fn('abc');
          fn('ab-c');
          fn('abc7');

          iterAsciiChars(function(str) {
            return (str.search(regexFilter) >= 0);
          }, fn);

        }
      );

      it('Should throw an error when invalid characters are used.', function() {

        var fn = function(key) {
          expect(function() {
            util.name.create([key]);
          }).to.throw(Error, /Invalid name part .*/, key);
        };

        fn('ab_c');
        fn('7abc');
        fn('');
        fn('-abc');
        fn('ab.c');
        fn('Abc');
        fn('aBc');
        fn('abC');

        iterAsciiChars(function(str) {
          return (str.search(regexFilter) < 0);
        }, fn);

      });

    });

  });

  describe('#longname module', function() {

    describe('#getValidateRegex()', function() {
      it('should return the correct regex', function() {
        var expected = /^[a-z][a-z0-9\-]{2,19}$/;
        var result = util.longname.getValidateRegex();
        expect(result).to.deep.equal(expected);
      });
    });

    describe('#isValid()', function() {

      var fnTest = function(inputs, expected) {
        it('should return ' + expected + ' for expected inputs.', function() {
          assert(inputs.length > 0);
          inputs.forEach(function(input) {
            var result = util.longname.isValid(input);
            expect(result).to.equal(expected, input);
          });
        });
      };

      // valid inputs
      fnTest([
        'adfd'
      ], true);
      // invalid inputs
      fnTest([
        'a',
        'ab',
        'aaaaaaaaaaaaaaaaaaaaa',
        '7abc',
        '-abc',
        'a_b'
      ], false);

    });

  });

  describe('helpers', function() {

    describe('#find()', function() {

      it('should return null if no item is found.', function() {
        var inputs = [1, 2, 3];
        var expected = null;
        var result = util.helpers.find(inputs, function(n) { return n === 4; });
        expect(result).to.equal(expected);
      });

      it('should return the correct item if it is found.', function() {
        var inputs = [1, 2, 3];
        var expected = 2;
        var result = util.helpers.find(inputs, function(n) {return n === 2;});
        expect(result).to.equal(expected);
      });

    });

    describe('#findMap()', function() {

      it('should return the correct mapped value if it is found.', function() {
        var inputs = [1, 2, 3];
        var expected = 9;
        var filter = function(input) { return input === 3; };
        var map = function(input) { return input * input; };
        var result = util.helpers.findMap(inputs, filter, map);
        expect(result).to.equal(expected);
      });

    });

    describe('#filterMap()', function() {

      it('should filter and map correctly.', function() {
        var inputs = [1, 3, 4, 6];
        var filter = function(num) {
          return num % 2 === 0;
        };
        var map = function(num) {
          return num * num;
        };
        var result = util.helpers.filterMap(inputs, filter, map);
        expect(result).to.deep.equal([16, 36]);
      });

    });

  });

  describe.skip('searchForPath', function() {

    var fakeFs = null;

    var homePath = process.env.HOME;

    var mapToHome = function(paths) {
      return paths.map(function(path) {
        return _path.join(homePath, path);
      });
    };

    beforeEach(function() {
      fakeFs = testUtil.mockFs.create({
        'kalabox': {
          'foo' : {}
        }
      });
    });

    afterEach(function() {
      fakeFs.restore();
    });

    it('should return the correct path if it exists.', function() {
      var inputs = mapToHome([
        '/kalabox/bar/',
        '/kalabox/foo/',
        '/kalabox/bazz'
      ]);
      var result = util.searchForPath(inputs);
      expect(result).to.equal(_path.join(homePath, '/kalabox/foo/'));
    });

    it('should return null when the path doesnt exist.', function() {
      var inputs = mapToHome([
        '/kalabox/elvis/',
        '/kalabox/choppah/',
        '/kalabox/thatshowwinningisdone/',
        '/kalabox/kalatuna/'
      ]);
      var result = util.searchForPath(inputs);
      expect(result).to.equal(null);
    });

  });

});
