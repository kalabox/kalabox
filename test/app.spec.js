'use strict';

var App = require('../lib/app.js'),
  assert = require('chai').assert,
  expect = require('chai').expect,
  path = require('path'),
  rewire = require('rewire'),
  app = rewire('../lib/app.js'),
  fs = require('fs'),
  sinon = require('sinon'),
  _ = require('lodash'),
  test_util = require('../lib/test_util.js');

describe('app.js', function () {

  describe('#loadConfig()', function () {

    // setup mocks
    var mock_path = {
      resolve: function () { }
    },    
    mock_fs = {
      existsSync: function () {}
    },
    mock_require = {
      require: function () { return mock_app_config; }
    },
    /*mock_require = function (path) {
      return mock_app_config;
    },*/
    mock_app = {
      kconfig: {
        appDataPath: '/path/to/data/',
        domain: 'mydomain3'
      },
      path: '/path/to/app/'
    },
    mock_app_config = {
      name: 'myapp5',
      components: { data: { name: 'dataname6' } }
    },
    sandbox;

    // setup modules being tested
    var app = rewire('../lib/app.js'),
    loadConfig = app.__get__('loadConfig');
    app.__set__('fs', mock_fs);
    app.__set__('path', mock_path);
    app.__set__('require', mock_require.require);

    // stubs
    var stub_existsSync,
      stub_resolve;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
      stub_existsSync = sandbox.stub(mock_fs, 'existsSync');
      stub_resolve = sandbox.stub(mock_path, 'resolve', path.join);
    });

    afterEach(function () {
      sandbox.restore();
    });

    [
      ['app.profilePath', '/path/to/app/.kalabox'],
      ['configFile', '/path/to/app/.kalabox/profile.json']
    ].forEach(function (arr) {
      it('Should throw an error when ' + arr[0] + ' doesnt exist', function () {
        // setup stubs
        stub_existsSync.withArgs(arr[1]).returns(false);
        stub_existsSync.returns(true);
        // run unit being tested
        var fn = function () { loadConfig(mock_app) };
        // verify expectations
        expect(fn).to.throw(Error, 'File does not exist: /path/to/app/.kalabox');
      });
    });

    it('Should set the correct properties of the passed in app object.', function () {

      // setup stubs
      stub_existsSync.returns(true);
      
      // run unit being tested
      loadConfig(mock_app);

      // verify expectations
      assert.deepEqual(mock_app.kconfig, {
        appDataPath: '/path/to/data/',
        domain: 'mydomain3'
      });

      assert.deepEqual(mock_app.tasks, {});
      assert.equal(mock_app.profilePath, '/path/to/app/.kalabox');
      assert.deepEqual(mock_app.config, mock_app_config);
      assert.equal(mock_app.name, 'myapp5');
      assert.equal(mock_app.appdomain, 'myapp5.mydomain3');
      assert.equal(mock_app.dataPath, '/path/to/data/myapp5');
      assert.equal(mock_app.cidPath, '/path/to/data/myapp5/cids');
      assert.equal(mock_app.url, 'http://myapp5.mydomain3');
      assert.equal(mock_app.prefix, 'myapp5_');
      assert.equal(mock_app.hasData, true);
      assert.equal(mock_app.dataCname, 'kb_myapp5_data');

      sinon.assert.callCount(stub_existsSync, 2);
      sinon.assert.calledWithExactly(stub_existsSync, '/path/to/app/.kalabox');
      sinon.assert.calledWithExactly(stub_existsSync, '/path/to/app/.kalabox/profile.json');

      sinon.assert.callCount(stub_resolve, 4);
      [
        ['/path/to/app/', '.kalabox'],
        ['/path/to/app/', '.kalabox'],
        ['/path/to/data/', 'myapp5'],
        ['/path/to/data/myapp5', 'cids']
      ].forEach(function (arr) {
        sinon.assert.calledWithExactly(stub_resolve, arr[0], arr[1]);
      });
    });

  });

  describe('#loadComponents()', function () {

    var mock_app_api = {
      config: {
        components: {
          data: { name: 'mydata4' },
          web: { name: 'my-webby' },
          db: { name: 'reddis' },
          foo: { name: 'bar' },
          all: { name: 'thethings' }
        }
      }
    },
    mock_cmp_api = {
      Component: function () {}
    };

    it('Should call component.Component with the correct arguments.', function () {
    
      // setup modules  
      var app = rewire('../lib/app.js'),
      loadComponents = app.__get__('loadComponents');
      app.__set__('cmp', mock_cmp_api);

      // create stubs
      var mock_cmp = sinon.mock(mock_cmp_api);
      [ 
        {key: 'data', name: 'mydata4'},
        {key: 'web', name: 'my-webby'},
        {key: 'db', name: 'reddis'},
        {key: 'foo', name: 'bar'},
        {key: 'all', name: 'thethings'}
      ].forEach(function (x) {
        mock_cmp.expects('Component').withExactArgs(
          sinon.match.object,
          x.key,
          { name: x.name }
        );
      });

      // run unit being tested 
      loadComponents(mock_app_api);

      // verify expectations
      mock_cmp.verify();

      // check properties
      ['data', 'web', 'db', 'foo', 'all'].forEach(function (x) {
        expect(mock_app_api.components).to.have.property(x);
      });

    });

  });

  describe('#loadPath()', function () {

    // mock modules
    var mock_path_api = {
      resolve: function (a, b) { return path.join(a, b); }
    },
    mock_fs_api = {
      existsSync: function () {}
    },
    mock_app_api = {
      profilePath: '/app/profile/path/',
      kconfig: {
        dataPath: '/kconfig/path/',
        baseDir: '/kconfig/base/dir/'
      }
    };

    // setup module being tested
    var app = rewire('../lib/app.js'),
    loadPath = app.__get__('loadPath');
    app.__set__('path', mock_path_api);
    app.__set__('fs', mock_fs_api);

    //create stubs
    var stub = sinon.stub(mock_fs_api, 'existsSync');

    [
      {name: 'profilePath', path: mock_app_api.profilePath },
      {name: 'kconfig.dataPath', path: mock_app_api.kconfig.dataPath },
      {name: 'kconfig.baseDir', path: mock_app_api.kconfig.baseDir }
    ].forEach(function (x) {
      it('Should return the correct path when ' + x.name + ' exists.', function () {
        var expected = path.join(x.path, 'relative/path/');
        // setup stub
        stub.withArgs(expected).onFirstCall().returns(true);
        // run unit being tested
        var result = loadPath(mock_app_api, '/relative/path/');
        // verify expectations
        assert.equal(result, expected);
      });
    });

    it('Should return false when none of the config paths exist.', function () {
      var expected = false;
      // setup stub
      stub.returns(false);
      // run unit being tested
      var result = loadPath(mock_app_api, '/this/path/does/not/exist/');
      // verify expectations
      assert.equal(result, expected);
    });
        
  });

  describe('#setDataPath()', function () {

    var mock_fs,
    mock_fs_config = {
      '/home/elvis/': {},
      'home': {
        'elvis': {}
      }
    },
    home_path = '/home/elvis/',
    dataPath = path.join(home_path, '.kalabox'),
    appDataPath = path.join(dataPath, 'apps'),
    appName = 'myappyapp',
    appPath = path.join(appDataPath, appName),
    cidPath = path.join(appPath, 'cids'),
    fake_app = {
      name: appName,
      kconfig: {
        appDataPath: appDataPath,
        dataPath: dataPath,
      }
    };
    
    beforeEach(function () {
      mock_fs = test_util.mock_fs.create(mock_fs_config);
    });

    afterEach(function () {
      mock_fs.restore();
    });

    it('Should create app.kconfig.dataPath if it doesnt exist.', function () {
      // setup
      var files = [
        fake_app.kconfig.dataPath,
        fake_app.kconfig.appDataPath,
        appPath,
        cidPath
      ],
      setDataPath = app.__get__('setDataPath'),
      verify = function (expected) {
        files.forEach(function (file) {
          expect(fs.existsSync(file)).to.be.equal(expected, file);
        });
      };

      // pre-verify
      verify(false);
      // run unit being tested
      setDataPath(fake_app);
      // post-verify
      verify(true);
    });
    
  });

});
