'use strict';

var kbox = require('../lib/kbox.js');
var deps = kbox.core.deps;
var plugin = kbox.core.plugin;
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

describe('#plugin module', function() {

  describe('#initPlugin()', function() {

    it(
      'should call callback with dependencies automatically set.',
      function(done) {
        var _app = {name:'myappname'};
        var _manager = {start: function() {}};
        var _plugin = {key:'mykey'};
        deps.register('app', _app);
        var overrides = {
          plugin: _plugin.key
        };
        deps.override({manager:_manager}, function(next) {
          plugin.initPlugin(_plugin, overrides, function(plugin, app, manager) {
            expect(_plugin.key).to.equal('mykey');
            expect(app).to.equal(_app);
            deps.clear();
            expect(manager).to.equal(_manager);
            next();
            done();
          });
        });
      }
    );

  });

  describe('#pluginUsesApp()', function() {
    it(
      'should return true if app is used in the plugin function.',
      function() {
        var rawPlugin = function(foo, app, bar) {
          // do nothing
        };
        var result = plugin.pluginUsesApp(rawPlugin);
        var expected = true;
        expect(result).to.equal(expected);
      }
    );
    it(
      'should return false if app is NOT used in the plugin function.',
      function() {
        var rawPlugin = function(foo, bar, bazz) {
          // do nothing
        };
        var result = plugin.pluginUsesApp(rawPlugin);
        var expected = false;
        expect(result).to.equal(expected);
      }
    );
  });

});
