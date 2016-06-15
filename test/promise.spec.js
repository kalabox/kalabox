'use strict';

// Setup chai.
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
//var expect = chai.expect;
chai.should();

// Load kbox modules.
var Promise = require('../lib/promise.js');

describe('Promise', function() {

  describe('#retry', function() {

    /*
     * Just make sure when there isn't an error the promise resolves
     * correctly.
     */
    it('should work normally when there is no error', function() {

      return Promise.retry(function() {
        return 'foo';
      })
      .should.become('foo');

    });

    /*
     * Make it will retry after failing a number of times.
     */
    it('should retry multiple times', function() {

      this.timeout(10 * 1000);

      var counter = 0;

      return Promise.retry(function() {
        if (counter < 4) {
          counter += 1;
          throw new Error(counter);
        } else {
          return 'hungry like the wolf';
        }
      })
      .should.become('hungry like the wolf');

    });

    /*
     * Make sure once the max retries are reached it fails.
     */
    it('should fail after trying max times', function() {

      var counter = 0;

      var opts = {
        max: 3,
        backoff: 50
      };

      return Promise.retry(function() {
        if (counter < 4) {
          counter += 1;
          throw new Error('kittens');
        } else {
          return 'hungry like the wolf';
        }
      }, opts)
      .should.be
      .rejectedWith(/Failed after 3 retries. {"max":3,"backoff":50}: kittens/);

    });

  });

  describe('#wrap', function() {

    /*
     * Here we are making sure wrap takes an error and wraps it in a more
     * specific error with a more specific error message.
     */
    it('should wrap an error with extra info', function() {

      return Promise.try(function() {
        throw new Error('foo');
      })
      .wrap('%s', 'bar')
      .wrap('bazz')
      .should.be.rejectedWith(/^bazz: bar: foo$/);

    });

    /*
     * Here we want to make sure wrap has no effect on an unrejected
     * promise.
     */
    it('should have no effect on a promise that isnt rejected', function() {

      return Promise.resolve('burrito')
      .wrap('blahblahblah')
      .should.become('burrito');

    });

  });

});
