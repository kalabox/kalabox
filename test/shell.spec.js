'use strict';

var shell = require('../lib/shell.js');
var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;

describe('#shell module', function() {

  describe('#exec()', function() {

    it('should return the correct output.', function(done) {
      var expected = 'elvis\n';
      var cmd = 'echo elvis';
      shell.exec(cmd, function(err, output) {
        expect(output).to.equal(expected);
        done();
      });
    });

    it('should return an error when the cmd fails.', function(done) {
      var cmd = 'not_a_real_program';
      var regex = /code: 127, msg: \/bin\/sh: not_a_real_program: [a-z ]*not found\n/;
      shell.exec(cmd, function(err, output) {
        expect(err).to.not.equal(null);
        expect(err.message).to.match(regex);
        done();
      });
    });

  });

});
