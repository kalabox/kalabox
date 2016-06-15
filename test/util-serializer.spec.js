'use strict';

// Setup chai.
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
chai.should();

// Load kbox modules.
var Promise = require('../lib/promise.js');
var Serializer = require('../lib/util/serializer.js');

describe('Serializer', function() {

  var serializer = null;

  /*
   * Reset serializer object before each test.
   */
  beforeEach(function() {
    serializer = new Serializer();
  });

  describe('#enqueue', function() {

    /*
     * Here we are just making sure enqueue returns a promise.
     */
    it('should return a promise', function() {

      return serializer.enqueue(function() {}).should.eventually.be.fulfilled;

    });

    /*
     * Here we are making sure serializer does the serializing.
     */
    it('should only run one function at a time and in order', function() {

      var data = '';
      function write(s) {
        data += s;
      }

      serializer.enqueue(function() {
        return Promise.delay(500)
        .then(function() {
          write('1');
        });
      });

      serializer.enqueue(function() {
        write('2');
      });

      return serializer.enqueue(function() {
        return Promise.delay(100)
        .then(function() {
          write('3');
        });
      })
      .then(function() {
        expect(data).to.equal('123');
      });

    });

    /*
     * Here we are making sure a serialized function that rejects doesn't
     * stop the other functions from running.
     */
    it('should handle errors correctly', function() {

      var data = '';
      function write(s) {
        data += s;
      }

      serializer.enqueue(function() {
        return Promise.delay(500)
        .then(function() {
          if (true) {
            throw new Error('unicorns!');
          }
          write('1');
        });
      })
      .then(function() {
        throw new Error('expected an error!');
      })
      .catch(function(err) {
        if (err.message !== 'unicorns!') {
          throw err;
        }
      });

      serializer.enqueue(function() {
        write('2');
      });

      return serializer.enqueue(function() {
        return Promise.delay(100)
        .then(function() {
          write('3');
        });
      })
      .then(function() {
        expect(data).to.equal('23');
      })
      .should.not.be.rejected;

    });

  });

});
