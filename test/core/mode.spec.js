'use strict';

var chai = require('chai');
var expect = chai.expect;
var rewire = require('rewire');
var mode = rewire('../../lib/core/mode.js');

describe('mode module', function() {

  describe('#set()', function() {

    it('should correctly set the mode.', function() {
      expect(mode.set('cli')).to.equal('cli');
      expect(mode.get()).to.equal('cli');
    });

    it('should validate the mode being set.', function() {
      var fn = function(modeToSet) {
        return function() {
          mode.clear();
          mode.set(modeToSet);
        };
      };
      expect(fn('cli')).to.not.throw(Error);
      expect(fn('gui')).to.not.throw(Error);
      expect(fn('foo')).to.throw(Error, 'Invalid mode: foo');
      expect(fn('bar')).to.throw(Error, 'Invalid mode: bar');
    });

    it('should throw an error if it has already been set.', function() {
      mode.clear();
      mode.set('cli');
      expect(
        function() { mode.set('gui'); }
      ).to.throw('Mode has already been set: cli');
    });

  });

});
