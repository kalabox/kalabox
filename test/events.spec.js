'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var kbox = require('../lib/kbox.js');
var events = kbox.core.events;

describe('events module', function() {
  describe('#emit()', function() {
    it('should wait for all event handlers to finish before calling cb func.', function(done) {
      var alpha = false;
      var bravo = false;
      events.on('test', function(err, next) {
        setTimeout(function() {
          alpha = true;
          next();
        }, 50);
      });
      events.on('test', function(err, next) {
        setTimeout(function() {
          bravo = true;
          next();
        }, 50);
      });
      events.emit('test', function() {
        expect(alpha).to.equal(true);
        expect(bravo).to.equal(true);
        done();
      });
    });
  });
});
