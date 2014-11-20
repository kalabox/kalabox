'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var Task = require('../lib/task.js');

describe('task module', function() {

  describe('#constuctor()', function() {

    it('should set all the correct values.', function() {
      var description = 'my task 7';
      var cmd = function(next) { next(null); };
      var timeout = 10 * 1000;
      var task = new Task(description, cmd, timeout);
      expect(task.getDescription()).to.deep.equal(description);
      expect(task.getCommand()).to.deep.equal(cmd);
      expect(task.getTimeout()).to.deep.equal(timeout);
    });

    it('should set the default timeout value.', function() {
      var cmd = function(next) { next(null); };
      var task = new Task('some task', cmd);
      expect(task.getTimeout()).to.equal(30 * 1000);
      task.setTimeout(60 * 1000);
      expect(task.getTimeout()).to.equal(60 * 1000);
    });

    it('should throw an error when the command is not a function.', function() {
      var cmd = 'this is not a function';
      var expectedMsg = 'While running task [gonna fail]' +
        ' Error: Command passed to task [this is not a function] is not a function.';
      var fn = function() {
        var task = new Task('gonna fail', cmd);
      };
      expect(fn).to.throw(Error, expectedMsg);
    });

  });

  describe('#run()', function() {

    it('should run the task given.', function(done) {
      var counter = 0;
      var stub = function(next) {
        counter += 1;
        next(null);
      };
      var task = new Task('mydescription', stub);
      task.run(function(err) {
        expect(err).to.equal(null);
        expect(counter).to.equal(1);
        done();
      });
    });

    it('should wrap returned errors with a context.', function(done) {
      var context = 'this is my function';
      var fn = function(next) {
        var err = new Error('Something bad happened.');
        next(err);
      };
      var expectedMsg = 'While running task [this is my function] Error: Something bad happened.';
      var task = new Task(context, fn);
      task.run(function(err) {
        expect(err).to.not.equal(null);
        expect(err.message).to.equal(expectedMsg);
        done();
      });
    });

    it('should return a timeout error when a timeout is reached.', function(done) {
      var desc = 'some task';
      var cmd = function(next) {
        // Next is never called, so task never ends.
      };
      var timeout = 75; // 75ms
      var expectedMsg = 'While running task [some task] Error: Task timed out after 75ms.';
      var task = new Task(desc, cmd, timeout);
      task.run(function(err) {
        expect(err).to.not.equal(null);
        expect(err.message).to.equal(expectedMsg);
        done();
      });
    });

  });

  describe('#on()', function() {

    it('should subscribe the end event.', function(done) {
      var cmd = function(next) {
        next(null);
      };
      var task = new Task('my task', cmd);
      task.on('end', function() {
        done();
      });
      task.run();
    });

    it('should subscribe to the error event.', function(done) {
      var cmd = function(next) {
        next(new Error('Flux capacitor failure.'));
      };
      var expectedMsg = 'While running task [BTtF] Error: Flux capacitor failure.';
      var task = new Task('BTtF', cmd);
      task.on('error', function(err) {
        expect(err).to.not.equal(null);
        expect(err.message).to.equal(expectedMsg);
        done();
      });
      task.run();
    });

    it('should subscribe to the timeout event.', function(done) {
      var cmd = function(next)  {
        // Never calls next, so never completes.
      };
      var timeout = 50; // 50ms
      var task = new Task('never ending task', cmd, timeout);
      task.on('timeout', function() {
        done();
      });
      task.run();
    });

    it('should throw an error when an invalid event is subscribed to.', function(done) {
      var cmd = function(next) {
        next(null);
      };
      var task = new Task('my task', cmd);
      var fn = function() {
        task.on('fakeEventName', function() {});
      };
      expect(fn).to.throw(Error, 'Invalid event name "fakeEventName"');
      done();
    });

  });

});
