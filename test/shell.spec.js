'use strict';

var kbox = require('../lib/kbox.js');
var shell = kbox.util.shell;
var chai = require('chai');
var expect = chai.expect;
var sinon = require('sinon');
var platformSpec = require('./platform.spec.js');

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
      var regex =
      /code: 127, msg: \/bin\/sh: [1: ]*not_a_real_program: [a-z ]*not found\n/;
      shell.exec(cmd, function(err) {
        expect(err).to.not.equal(null);
        expect(err.message).to.match(regex);
        done();
      });
    });

    it('should return a null error and the correct output.', function(done) {
      var cmd = 'which node';
      shell.exec(cmd, function(err, output) {
        expect(err).to.equal(null);
        expect(output).to.match(/node\n/);
        done();
      });
    });

    it('should return an error for a failed command.', function(done) {
      var cmd = 'which -fu this_is_not_a_real_executable';
      var expectedData =
        'which: illegal option -- f\nusage: which [-as] program ...\n';
      var expectedError = new Error({
        code: 1,
        data: expectedData
      });
      shell.exec(cmd, function(err) {
        expect(err).to.not.equal(null);
        expect(err.code).to.equal(expectedError.code);
        expect(err.data).to.equal(expectedError.data);
        done();
      });
    });

  });

  describe('#execAsync()', function() {

    it('should call the correct child.stdout callbacks.', function(done) {
      var cmd = 'echo "bazinga"';
      var child = shell.execAsync(cmd);
      var onData = sinon.spy();
      var api = {
        onEnd: function() {}
      };
      var onEnd = sinon.stub(api, 'onEnd', function() {
        sinon.assert.callCount(onData, 1);
        sinon.assert.calledWithExactly(onData, 'bazinga\n');
        sinon.assert.callCount(onEnd, 1);
        sinon.assert.calledWithExactly(onEnd);
        done();
      });
      child.stdout.on('data', onData);
      child.stdout.on('end', onEnd);
    });

    platformSpec.ifOsx(function() {
      it('should call the correct child.stderr callbacks.', function(done) {
        var cmd = 'not-a-real-command';
        var child = shell.execAsync(cmd);
        var onData = sinon.spy();
        child.stderr.on('data', onData);
        child.stdout.on('end', function() {
          expect(onData.callCount).to.be.above(0);
          done();
        });
      });
    });

  });

});
