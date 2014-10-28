'use strict';

var assert = require('chai').assert,
  expect = require('chai').expect,
  sinon = require('sinon'),
  rewire = require('rewire'),
  manager = rewire('../lib/manager.js'),
  timeout = 10,
  _ = require('lodash'),
  path = require('path'),
  test_util = require('../lib/test_util.js');

describe('manager.js', function () {

    function Fake_docker() {

      var ctns_enabled = [
        { Names: [' kb_myapp1_data'] },
        { Names: [' kb_myapp4_data'] }
      ];

      var ctns_disabled = [
        { Names: [' kb_myapp2_data'] },
        { Names: [' kb_myapp5_data'] },
        { Names: ['purge_me_1'], Id: '1234' },
        { Names: ['purge_me_2'], Id: '5678' },
        { Names: ['purge_me_3'], Id: '1428' }
      ];

      var container_api = {
        remove: function () {}
      };

      this.api = {
        listContainers: function () {},
        getContainer: function () {}
      };

      this.container_api = container_api;

      this.listContainers = function (filter, callback) {
        var _callback = callback ? callback : filter;
        var containers =
          callback ? ctns_enabled.concat(ctns_disabled) : ctns_enabled;
        var err = null;   
        _callback(err, containers);  
      };

      this.stubs = {};

      this.stubs['listContainers'] =
        sinon.stub(this.api, 'listContainers', this.listContainers);

      this.stubs['getContainer'] =
        sinon.stub(this.api, 'getContainer', function () { return container_api; });  

      this.remove = function (callback) { callback(null, 'somedata'); }
      this.stubs['remove'] = sinon.stub(container_api, 'remove', this.remove);
    };

    describe('#getApps()', function () {

      var fake_docker = new Fake_docker(),
      mock_fs;

      beforeEach(function () {
        mock_fs = test_util.mock_fs.create();
      });

      afterEach(function () {
        mock_fs.restore();
      });

      it('Should return an array of apps.', function (done) {
        var expected = {
          myapp1: { name: 'myapp1', status: 'enabled' },
          myapp2: { name: 'myapp2', status: 'disabled' },
          myapp3: { name: 'myapp3', status: 'uninstalled' },
          myapp4: { name: 'myapp4', status: 'enabled' },
          myapp5: { name: 'myapp5', status: 'disabled' },
        };
        // setup modules
        var mock_fs = require
        manager.__with__({
          docker: fake_docker.api
        })(function () {
          // run unit being tested
          var result = manager.getApps(function (apps) {
            //verify
            var stub_list = fake_docker.stubs['listContainers'];
            sinon.assert.callCount(stub_list, 2);
            sinon.assert.calledWithExactly(stub_list, sinon.match.func);
            sinon.assert.calledWithExactly(stub_list, sinon.match.object, sinon.match.func);
            expect(apps).to.be.deep.equal(expected);
            done();
          });
        });

      });

    });

  describe('#purgeContainers()', function () {
    it('Should call docker.container.remove with the correct args.', function () {

      var fake_docker = new Fake_docker(),
      spy_callback = sinon.spy();

      var manager = rewire('../lib/manager.js');
      manager.__set__('docker', fake_docker.api);
      manager.purgeContainers(spy_callback);

      var stub_list = fake_docker.stubs['listContainers'];
      sinon.assert.calledOnce(stub_list);
      sinon.assert.calledWith(stub_list, {all: 1});

      var stub_get = fake_docker.stubs['getContainer'];
      sinon.assert.callCount(stub_get, 3);
      sinon.assert.calledWithExactly(stub_get, '1234');
      sinon.assert.calledWithExactly(stub_get, '5678');
      sinon.assert.calledWithExactly(stub_get, '1428');

      var stub_remove = fake_docker.stubs['remove'];
      sinon.assert.callCount(stub_remove, 3);
      sinon.assert.alwaysCalledWithExactly(stub_remove, sinon.match.func);

      sinon.assert.callCount(spy_callback, 3);
      sinon.assert.alwaysCalledWithExactly(spy_callback, sinon.match.object);
    });
  });

  var run_test = function (name, fn_manager) {

    describe('#' + name + '()', function () {
      it('Should call app.emit with the correct args.', function (done) {
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
