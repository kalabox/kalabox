'use strict';

var kbox = require('../../lib/kbox.js');
var fw = kbox.install.framework;
var chai = require('chai');
var expect = chai.expect;

describe('install framework module', function() {

  before(function(beforeDone) {
    fw.registerStep(function(step, done) {
      step.name = 'a';
      step.deps = ['b'];
      step.all = function(state, next) {
        state.foo += step.name;
        next();
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'b';
      step.deps = [];
      step.all = function(state, next) {
        state.foo = step.name;
        next();
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'c';
      step.deps = ['a', 'd'];
      step.all = function(state, next) {
        state.foo += step.name;
        next();
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'd';
      step.deps = ['a'];
      step.all = function(state, next) {
        state.foo += step.name;
        next();
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'e';
      step.deps = [];
      step.all.win32 = function(state, next) {
        state.foo += step.name;
        next();
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'f';
      step.deps = ['a'];
      step.all.linux = function(state, next) {
        state.foo += step.name;
        next();
      };
      done();
      beforeDone();
    });
  });

  describe('#getSteps', function() {

    it('should sort steps based upon dependencies.', function() {
      var steps = fw.getSteps('darwin');
      expect(steps.length).to.equal(4);
      expect(steps[0].name).to.equal('b');
      expect(steps[1].name).to.equal('a');
      expect(steps[2].name).to.equal('d');
      expect(steps[3].name).to.equal('c');
    });

    it('should handle win32 correctly.', function() {
      var steps = fw.getSteps('win32');
      expect(steps.length).to.equal(5);
      expect(steps[0].name).to.equal('b');
      expect(steps[1].name).to.equal('a');
      expect(steps[2].name).to.equal('d');
      expect(steps[3].name).to.equal('c');
      expect(steps[4].name).to.equal('e');
    });

  });

  describe('#getInstall', function() {

    it('should run the correct steps in the correct order.', function(done) {
      var install = fw.getInstall('darwin');
      install(function(err, state) {
        expect(err).to.equal(undefined);
        expect(state.foo).to.equal('badc');
        done();
      });
    });

  });

});
