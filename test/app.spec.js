'use strict';

var App = require('../lib/app.js');
var assert = require('chai').assert;
var expect = require('chai').expect;
var path = require('path');
var rewire = require('rewire');
var app = rewire('../lib/app.js');
var fs = require('fs');
var sinon = require('sinon');
var _ = require('lodash');
var testUtil = require('../lib/test_util.js');

describe('app', function() {

  describe('#verifyAppNameIsValid()', function() {

    var fnTest = function(inputs, shouldThrow) {
      var msg = shouldThrow ? 'throw' : 'NOT throw';
      it('should ' + msg + ' an error when the appName is valid.', function() {
        inputs.forEach(function(input) {
          var fn = function() {
            app.__get__('verifyAppNameIsValid')(input);
          };
          if (shouldThrow) {
            expect(fn).to.throw(Error, sinon.match.string, input);
          } else {
            expect(fn).to.not.throw(input);
          }

        });
      });
    };

    // should NOT throw an error
    // @todo: add more example data here.
    fnTest([
      'abc',
      'abc-def-g',
      'aaaaaaaaaaaaaaaaaaaa'
    ], false);
    // should throw an error
    fnTest([
      '',
      '-abc',
      'aaaaaaaaaaaaaaaaaaaaa'
    ], true);

  });

  describe('#loadConfig()', function() {

    // setup mocks
    var mockPath = {
      resolve: function() {}
    };
    var mockFs = {
      existsSync: function() {}
    };
    var mockRequire = {
      require: function() {
        return mockAppConfig;
      }
    };
    /*mockRequire = function(path) {
      return mockAppConfig;
    },*/
    var mockApp = {
      kconfig: {
        appDataPath: '/path/to/data/',
        domain: 'mydomain3'
      },
      path: '/path/to/app/'
    };
    var mockAppConfig = {
      name: 'myapp5',
      components: {
        data: {
          name: 'dataname6'
        }
      }
    };
    var sandbox;

    // setup modules being tested
    var app = rewire('../lib/app.js');
    var loadConfig = app.__get__('loadConfig');
    app.__set__('fs', mockFs);
    app.__set__('path', mockPath);
    app.__set__('require', mockRequire.require);

    // stubs
    var stubExistsSync;
    var stubResolve;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      stubExistsSync = sandbox.stub(mockFs, 'existsSync');
      stubResolve = sandbox.stub(mockPath, 'resolve', path.join);
    });

    afterEach(function() {
      sandbox.restore();
    });

    [
      ['app.profilePath', '/path/to/app/.kalabox'],
      ['configFile', '/path/to/app/.kalabox/profile.json']
    ].forEach(function(arr) {
      it('Should throw an error when ' + arr[0] + ' doesnt exist', function() {
        // setup stubs
        stubExistsSync.withArgs(arr[1]).returns(false);
        stubExistsSync.returns(true);
        // run unit being tested
        var fn = function() {
          loadConfig(mockApp);
        };
        // verify expectations
        expect(fn).to.throw(Error, 'File does not exist: /path/to/app/.kalabox');
      });
    });

    it('Should set the correct properties of the passed in app object.', function() {

      // setup stubs
      stubExistsSync.returns(true);

      // run unit being tested
      loadConfig(mockApp);

      // verify expectations
      assert.deepEqual(mockApp.kconfig, {
        appDataPath: '/path/to/data/',
        domain: 'mydomain3'
      });

      assert.deepEqual(mockApp.tasks, {});
      assert.equal(mockApp.profilePath, '/path/to/app/.kalabox');
      assert.deepEqual(mockApp.config, mockAppConfig);
      assert.equal(mockApp.name, 'myapp5');
      assert.equal(mockApp.appdomain, 'myapp5.mydomain3');
      assert.equal(mockApp.dataPath, '/path/to/data/myapp5');
      assert.equal(mockApp.cidPath, '/path/to/data/myapp5/cids');
      assert.equal(mockApp.url, 'http://myapp5.mydomain3');
      assert.equal(mockApp.prefix, 'myapp5_');
      assert.equal(mockApp.hasData, true);
      assert.equal(mockApp.dataCname, 'kb_myapp5_data');

      sinon.assert.callCount(stubExistsSync, 2);
      sinon.assert.calledWithExactly(stubExistsSync, '/path/to/app/.kalabox');
      sinon.assert.calledWithExactly(stubExistsSync, '/path/to/app/.kalabox/profile.json');

      sinon.assert.callCount(stubResolve, 4);
      [
        ['/path/to/app/', '.kalabox'],
        ['/path/to/app/', '.kalabox'],
        ['/path/to/data/', 'myapp5'],
        ['/path/to/data/myapp5', 'cids']
      ].forEach(function(arr) {
        sinon.assert.calledWithExactly(stubResolve, arr[0], arr[1]);
      });
    });

  });

  describe('#loadComponents()', function() {

    var mockAppApi = {
      config: {
        components: {
          data: {
            name: 'mydata4'
          },
          web: {
            name: 'my-webby'
          },
          db: {
            name: 'reddis'
          },
          foo: {
            name: 'bar'
          },
          all: {
            name: 'thethings'
          }
        }
      }
    };
    var mockCmpApi = {
      Component: function() {}
    };

    it('Should call component.Component with the correct arguments.', function() {

      // setup modules
      var app = rewire('../lib/app.js');
      var loadComponents = app.__get__('loadComponents');
      app.__set__('cmp', mockCmpApi);

      // create stubs
      var mockCmp = sinon.mock(mockCmpApi);
      [{
        key: 'data',
        name: 'mydata4'
      }, {
        key: 'web',
        name: 'my-webby'
      }, {
        key: 'db',
        name: 'reddis'
      }, {
        key: 'foo',
        name: 'bar'
      }, {
        key: 'all',
        name: 'thethings'
      }].forEach(function(x) {
        mockCmp.expects('Component').withExactArgs(
          sinon.match.object,
          x.key, {
            name: x.name
          }
        );
      });

      // run unit being tested
      loadComponents(mockAppApi);

      // verify expectations
      mockCmp.verify();

      // check properties
      ['data', 'web', 'db', 'foo', 'all'].forEach(function(x) {
        expect(mockAppApi.components).to.have.property(x);
      });

    });

  });

  describe('#loadPath()', function() {

    // mock modules
    var mockPathApi = {
      resolve: function(a, b) {
        return path.join(a, b);
      }
    };
    var mockFsApi = {
      existsSync: function() {}
    };
    var mockAppApi = {
      profilePath: '/app/profile/path/',
      kconfig: {
        dataPath: '/kconfig/path/',
        baseDir: '/kconfig/base/dir/'
      }
    };

    // setup module being tested
    var app = rewire('../lib/app.js');
    var loadPath = app.__get__('loadPath');
    app.__set__('path', mockPathApi);
    app.__set__('fs', mockFsApi);

    //create stubs
    var stub = sinon.stub(mockFsApi, 'existsSync');

    [{
      name: 'profilePath',
      path: mockAppApi.profilePath
    }, {
      name: 'kconfig.dataPath',
      path: mockAppApi.kconfig.dataPath
    }, {
      name: 'kconfig.baseDir',
      path: mockAppApi.kconfig.baseDir
    }].forEach(function(x) {
      it('Should return the correct path when ' + x.name + ' exists.', function() {
        var expected = path.join(x.path, 'relative/path/');
        // setup stub
        stub.withArgs(expected).onFirstCall().returns(true);
        // run unit being tested
        var result = loadPath(mockAppApi, '/relative/path/');
        // verify expectations
        assert.equal(result, expected);
      });
    });

    it('Should return false when none of the config paths exist.', function() {
      var expected = false;
      // setup stub
      stub.returns(false);
      // run unit being tested
      var result = loadPath(mockAppApi, '/this/path/does/not/exist/');
      // verify expectations
      assert.equal(result, expected);
    });

  });

  describe('#setDataPath()', function() {

    var mockFs;
    var mockFsConfig = {
      '/home/elvis/': {},
      'home': {
        'elvis': {}
      }
    };
    var homePath = '/home/elvis/';
    var dataPath = path.join(homePath, '.kalabox');
    var appDataPath = path.join(dataPath, 'apps');
    var appName = 'myappyapp';
    var appPath = path.join(appDataPath, appName);
    var cidPath = path.join(appPath, 'cids');
    var fakeApp = {
      name: appName,
      kconfig: {
        appDataPath: appDataPath,
        dataPath: dataPath,
      }
    };

    beforeEach(function() {
      mockFs = testUtil.mockFs.create(mockFsConfig);
    });

    afterEach(function() {
      mockFs.restore();
    });

    it('Should create app.kconfig.dataPath if it doesnt exist.', function() {
      // setup
      var files = [
        fakeApp.kconfig.dataPath,
        fakeApp.kconfig.appDataPath,
        appPath,
        cidPath
      ];
      var setDataPath = app.__get__('setDataPath');
      var verify = function(expected) {
        files.forEach(function(file) {
          expect(fs.existsSync(file)).to.be.equal(expected, file);
        });
      };

      // pre-verify
      verify(false);
      // run unit being tested
      setDataPath(fakeApp);
      // post-verify
      verify(true);
    });

  });

});
