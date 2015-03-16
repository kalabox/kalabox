var chai = require('chai');
var expect = chai.expect;
var _require = require('../lib/require.js');

describe('require.js', function() {

  var _app = null;

  var kbox = {
    id: 'abcd1234',
    core: {
      deps: {
        lookup: function(name) {
          if (name === 'app') {
            return _app;
          }
        }
      }
    }
  };

  describe('#require', function() {

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

    it('shouldnt load a module using app if it is not registerd.', function() {
      var module = _require.require(kbox, './require-d');
      expect(typeof module).to.equal('function');
    });

    it('should load a module using app if it is registed.', function() {
      _app = {
        name: 'elvis'
      };
      var module = _require.require(kbox, '../test/require-d');
      expect(typeof module).to.equal('object');
      expect(module.test()).to.equal('elvis');
    });

  });

});
