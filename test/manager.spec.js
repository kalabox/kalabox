'use strict';

var assert = require('chai').assert,
  sinon = require('sinon'),
  manager = require('../lib/manager.js'),
  timeout = 500,
  _ = require('lodash');

describe('manager.js', function () {

  var run_test = function (name, fn_manager) {

    describe('#' + name + '()', function (done) {
      it('Should call app.emit with the correct args.', function () {
        var mock_app_api = {
          emit: function () {}  
        };
        var mock = sinon.mock(mock_app_api);
        mock.expects('emit').withArgs('pre-' + name);
        mock.expects('emit').withArgs('post-' + name);
        fn_manager(mock_app_api);
        setTimeout(function () {
          mock.verify();
          done();
        }, timeout);
      });
    });

  };

  var tests = [
    ['init', manager.init],
    ['start', manager.start],
    ['stop', manager.stop],
    ['kill', manager.kill],
    ['remove', manager.remove],
    ['pull', manager.pull],
    ['build', manager.build]
  ];

  _.map(tests, function (arr) {
    run_test(arr[0], arr[1]);
  });

});
