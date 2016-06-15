'use strict';

// Setup chai.
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
//var expect = chai.expect;
chai.should();

// Node modules.
var util = require('util');

// Load kbox modules.
//var Promise = require('../lib/promise.js');
var shell = require('../lib/util/shell.js');

describe('shell', function() {

  describe('#exec', function() {

    /*
     * Make sure a succesful command returns stdout.
     */
    it('should return a promise resolved to stdout', function() {

      if (process.platform === 'win32') {

      } else {

        return shell.exec(['echo', 'foo'])
        .should.eventually.match(/foo(\n|\r\n)/);

      }

    });

    /*
     * Make sure a failed command returns a corrently formatted error.
     */
    it('should return a fail object when it is rejected.', function() {

      if (process.platform === 'win32') {

      } else {

        var cmd = ['not-a-real-cmd'];

        var expected = util.format(
          'code: %serr:%s: %s(\n|\r\n)',
          '127',
          '/bin/sh: (1: )?' + cmd.join(' '),
          '(command )?not found'
        );

        var rx = new RegExp(expected);

        return shell.exec(['not-a-real-cmd']).should.be.rejectedWith(rx);

      }

    });

    /*
     * Make sure the environment is injected correctly.
     */
    it('should inject the environment correctly', function() {

      process.env.unicornRainbows = 'on fleek';
      process.env.catName = 'potato';

      var mockApp = {
        env: {
          getEnv: function() {
            return {
              favoriteColor: 'blue',
              catName: 'molly'
            };
          }
        }
      };

      var opts = {
        app: mockApp
      };

      if (process.platform === 'win32') {

      } else {

        return shell.exec(['env'], opts).should.eventually
        .match(/favoriteColor=blue(\n|\r\n)/)
        .match(/catName=molly(\n|\r\n)/)
        .match(/unicornRainbows=on fleek(\n|\r\n)/);

      }

    });

  });

});
