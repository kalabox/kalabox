'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var sinon = require('sinon');
var rewire = require('rewire');
var manager = rewire('../lib/manager.js');
var timeout = 10;
var _ = require('lodash');
var path = require('path');
var testUtil = require('../lib/test_util.js');

describe('manager', function() {

  function FakeDocker() {

    var ctnsEnabled = [{
      Names: [' kb_myapp1_data']
    }, {
      Names: [' kb_myapp4_data']
    }];

    var ctnsDisabled = [{
      Names: [' kb_myapp2_data']
    }, {
      Names: ['/kb_myapp5_data']
    }, {
      Names: [' purge_me_1'],
      Id: '1234'
    }, {
      Names: ['/purge_me_2'],
      Id: '5678'
    }, {
      Names: [' purge_me_3'],
      Id: '1428'
    }];

    var containerApi = {
      remove: function() {}
    };

    this.api = {
      listContainers: function() {},
      getContainer: function() {}
    };

    this.containerApi = containerApi;

    this.listContainers = function(filter, callback) {
      var _callback = callback ? callback : filter;
      var containers =
        callback ? ctnsEnabled.concat(ctnsDisabled) : ctnsEnabled;
      var err = null;
      _callback(err, containers);
    };

    this.stubs = {};

    this.stubs.listContainers =
      sinon.stub(this.api, 'listContainers', this.listContainers);

    this.stubs.getContainer =
      sinon.stub(this.api, 'getContainer', function() {
        return containerApi;
      });

    this.remove = function(callback) {
      callback(null, 'somedata');
    };
    this.stubs.remove = sinon.stub(containerApi, 'remove', this.remove);
  }

  describe('#getApps()', function() {

    var fakeDocker = new FakeDocker();
    var mockFs;

    beforeEach(function() {
      mockFs = testUtil.mockFs.create();
    });

    afterEach(function() {
      mockFs.restore();
    });

    it('Should return an array of apps.', function(done) {
      var expected = {
        myapp1: {
          name: 'myapp1',
          status: 'enabled'
        },
        myapp2: {
          name: 'myapp2',
          status: 'disabled'
        },
        myapp3: {
          name: 'myapp3',
          status: 'uninstalled'
        },
        myapp4: {
          name: 'myapp4',
          status: 'enabled'
        },
        myapp5: {
          name: 'myapp5',
          status: 'disabled'
        },
      };
      // setup modules
      var mockFs = require;
      manager.__with__({
        docker: fakeDocker.api
      })(function() {
        // run unit being tested
        var result = manager.getApps(function(apps) {
          //verify
          var stubList = fakeDocker.stubs.listContainers;
          sinon.assert.callCount(stubList, 2);
          sinon.assert.calledWithExactly(stubList, sinon.match.func);
          sinon.assert.calledWithExactly(stubList, sinon.match.object, sinon.match.func);
          expect(apps).to.be.deep.equal(expected);
          done();
        });
      });
    });
  });

  describe('#purgeContainers()', function() {
    it('Should call docker.container.remove with the correct args.', function() {

      var fakeDocker = new FakeDocker();
      var spyCallback = sinon.spy();

      var manager = rewire('../lib/manager.js');
      manager.__set__('docker', fakeDocker.api);
      manager.purgeContainers(spyCallback);

      var stubList = fakeDocker.stubs.listContainers;
      sinon.assert.calledOnce(stubList);
      sinon.assert.calledWith(stubList, {
        all: 1
      });

      var stubGet = fakeDocker.stubs.getContainer;
      sinon.assert.callCount(stubGet, 3);
      sinon.assert.calledWithExactly(stubGet, '1234');
      sinon.assert.calledWithExactly(stubGet, '5678');
      sinon.assert.calledWithExactly(stubGet, '1428');

      var stubRemove = fakeDocker.stubs.remove;
      sinon.assert.callCount(stubRemove, 3);
      sinon.assert.alwaysCalledWithExactly(stubRemove, sinon.match.func);

      sinon.assert.callCount(spyCallback, 3);
      sinon.assert.alwaysCalledWithExactly(spyCallback, sinon.match.object);
    });
  });

  var runTest = function(name, fnManager) {
    describe('#' + name + '()', function() {
      it('Should call app.emit with the correct args.', function(done) {
        var mockAppApi = {
          emit: function() {}
        };
        var mock = sinon.mock(mockAppApi);
        mock.expects('emit').withArgs('pre-' + name);
        mock.expects('emit').withArgs('post-' + name);
        fnManager(mockAppApi);
        setTimeout(function() {
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
  _.map(tests, function(arr) {
    runTest(arr[0], arr[1]);
  });
});
