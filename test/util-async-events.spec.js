'use strict';

// Setup chai.
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
chai.should();

// Load kbox modules.
var AsyncEvents = require('../lib/util/asyncEvents.js');
var Promise = require('../lib/promise.js');

describe('AsyncEvents', function() {

  var events = null;

  /*
   * Reset events object before each test.
   */
  beforeEach(function() {
    events = new AsyncEvents();
  });

  /*
   * Remove event handlers after each test.
   */
  afterEach(function() {
    events.removeAllListeners();
  });

  describe('#emit', function() {

    /*
     * Here we expect emit to resolve to a promise.
     */
    it('should return a promise', function() {

      var p = events.emit('testing');
      expect(p).to.be.an.instanceOf(Promise);

    });

    /*
     * Here we expect emit to execute the event handler.
     */
    it('should emit an event', function() {
      var data = null;
      events.on('test', function() {
        data = 'foo';
      });
      return events.emit('test')
      .then(function() {
        expect(data).to.be.equal('foo');
      });
    });

    /*
     * Here we expect the payload given to emit to be passed to the event
     * handler.
     */
    it('should delivery a payload', function(done) {
      events.on('test', function(payload) {
        expect(payload).to.equal('foobar');
        done();
      });
      events.emit('test', 'foobar');
    });

  });

  describe('#on', function() {

    /*
     * Here we expect the priorities of the event handlers to have them
     * run in a certain order.
     */
    it('should support priorities', function(done) {

      var data = '';
      function write(s) {
        data += s;
      }

      events.on('test1', 9, function() {
        write('c');
      });
      events.on('test1', function() {
        write('b');
      });
      events.on('test1', 1, function() {
        write('a');
      });
      events.on('test2', 1, function() {
        write('d');
      });
      events.on('test2', 9, function() {
        write('f');
      });
      events.on('test2', function() {
        write('e');
      });

      return events.emit('test1')
      .then(function() {
        return events.emit('test2');
      })
      .then(function() {
        expect(data).to.be.equal('abcdef');
      })
      .nodeify(done);

    });

    /*
     * Here we expect the event handlers to be executed in order and for
     * the next one to only execute after the first has become resolved.
     */
    it('should support promises', function(done) {

      var data = '';
      function write(s) {
        data += s;
      }

      events.on('test1', 1, function() {
        return Promise.delay('500')
        .then(function() {
          write('a');
        });
      });

      events.on('test1', 2, function() {
        write('b');
      });

      events.on('test1', 3, function() {
        return Promise.delay('500')
        .then(function() {
          write('c');
        });
      });

      return events.emit('test1')
      .then(function() {
        expect(data).to.be.equal('abc');
      })
      .nodeify(done);

    });

    /*
     * Here we expect the error in the event handler to be passed back to
     * the emit as a rejected promise.
     */
    it('should return errors to emit', function() {

      events.on('slap', function() {
        throw new Error('pow!');
      });

      return events.emit('slap')
      .should.be.rejectedWith('pow!');

    });

  });

});
