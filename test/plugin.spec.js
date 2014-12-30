'use strict';

var kbox = require('../lib/kbox.js');
var deps = kbox.core.deps;
var plugin = kbox.core.plugin;
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

describe('#plugin module', function() {

  describe('#init()', function() {

    it('should call callback with dependencies automatically set.', function(done) {
      var _app = {name:'myappname'};
      var _manager = {start: function() {}};
      var _plugin = {key:'mykey'};
      deps.register('app', _app);
      var overrides = {
        plugin: _plugin.key
      };
      deps.override({manager:_manager}, function(next) {
        plugin.init(_plugin, overrides, function(plugin, app, manager) {
          expect(_plugin.key).to.equal('mykey');
          expect(app).to.equal(_app);
          deps.clear();
          expect(manager).to.equal(_manager);
          next();
          done();
        });
      });
    });

  });

});
