'use strict';

var kbox = require('../../lib/kbox.js');
var fw = kbox.install.framework;
var chai = require('chai');
var expect = chai.expect;

describe('install framework module', function() {

  before(function(beforeDone) {
    fw.registerStep(function(step) {
      step.name = 'a';
      step.description = 'step a';
      step.deps = ['b'];
      step.all = function(state) {
        state.foo += step.name;
      };
    });
    fw.registerStep(function(step) {
      step.name = 'b';
      step.description = 'step b';
      step.deps = [];
      step.all = function(state) {
        state.foo = step.name;
      };
    });
    fw.registerStep(function(step, done) {
      step.name = 'c';
      step.description = 'step c';
      step.deps = ['a', 'd'];
      step.all = function(state, next) {
        state.foo += step.name;
        setTimeout(function() {
          next();
        }, 300);
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'd';
      step.description = 'step d';
      step.deps = ['a'];
      step.all = function(state, next) {
        state.foo += step.name;
        next();
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'e';
      step.description = 'step e';
      step.deps = [];
      step.all.win32 = function(state, next) {
        state.foo += step.name;
        next();
      };
      done();
    });
    fw.registerStep(function(step, done) {
      step.name = 'f';
      step.description = 'step f';
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
      var state = {};
      var preStepLog = '';
      fw.events.on('pre-step', function(step) {
        preStepLog += step.name;
      });
      var postStepLog = '';
      fw.events.on('post-step', function(step) {
        postStepLog += step.name;
      });
      fw.events.on('error', function(err) {
        throw err;
      });
      fw.events.on('end', function(state) {
        expect(state.foo).to.equal('badc');
        expect(preStepLog).to.equal('badc');
        expect(postStepLog).to.equal('badc');
        done();
      });
      install(state);
    });

  });

});
