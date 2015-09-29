'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var kbox = require('../lib/kbox.js');
var events = kbox.core.events;

describe('events module', function() {

  before(function() {
    var globalConfig = kbox.core.config.getGlobalConfig();
    kbox.core.deps.registerIf('globalConfig', globalConfig);
  });

  describe('#emit()', function() {

    it('should wait for all event handlers before calling cb.',
      function(done) {
        var alpha = false;
        var bravo = false;
        events.on('test', function(next) {
          setTimeout(function() {
            alpha = true;
            next();
          }, 50);
        });
        events.on('test', function(next) {
          setTimeout(function() {
            bravo = true;
            next();
          }, 50);
        });
        events.emit('test', function(err) {
          expect(err).to.equal(null);
          expect(alpha).to.equal(true);
          expect(bravo).to.equal(true);
          done();
        });
      }
    );

    it('should call prioritized handlers in the correct order.',
      function(done) {
        var state = '';
        events.on('test', 0, function(next) {
          setTimeout(function() {
            state += 'a';
            next();
          }, 50);
        });
        events.on('test', 1, function(next) {
          setTimeout(function() {
            state += 'b';
            next();
          }, 50);
        });
        events.on('test', 9, function(next) {
          setTimeout(function() {
            state += 'd';
            next();
          }, 50);
        });
        events.on('test', function(next) {
          setTimeout(function() {
            state += 'c';
            next();
          }, 50);
        });
        events.emit('test', function(err) {
          expect(err).to.equal(null);
          expect(state).to.equal('abcd');
          done();
        });
      }
    );

    it('should pass the context correctly.', function(done) {
      var alpha = false;
      var bravo = false;
      var someObject = {name: 'elvis'};
      events.on('test2', function(context, next) {
        expect(context).to.deep.equal({name: 'elvis'});
        setTimeout(function() {
          alpha = true;
          next();
        }, 50);
      });
      events.on('test2', function(context, next) {
        expect(context).to.deep.equal({name: 'elvis'});
        setTimeout(function() {
          bravo = true;
          next();
        }, 50);
      });
      events.emit('test2', someObject, function(err) {
        expect(err).to.equal(null);
        expect(alpha).to.equal(true);
        expect(bravo).to.equal(true);
        done();
      });
    });

    it('should handle errors correctly.', function(done) {
      var alpha = false;
      var bravo = false;
      events.on('test3', function(next) {
        setTimeout(function() {
          alpha = true;
          next();
        }, 50);
      });
      events.on('test3', function(next) {
        next(new Error('foo'));
      });
      events.on('test3', function(next) {
        setTimeout(function() {
          bravo = true;
          next();
        }, 50);
      });
      events.emit('test3', function(err) {
        expect(err).to.not.equal(null);
        expect(alpha).to.equal(true);
        expect(bravo).to.equal(false);
        done();
      });

    });

  });

});
