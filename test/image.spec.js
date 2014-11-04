'use strict';

var rewire = require('rewire'),
  img = rewire('../lib/image.js'),
  expect = require('chai').expect,
  path = require('path'),
  sinon = require('sinon');

describe('image', function () {

  var mockImage = {
    name: 'myimagename',
    src: '/my/path/1/'
  },
  mockDockerApi = {
    buildImage: function () {},
    pull: function () {}
  },
  mockStreamApi = {
    on: function () {}
  },
  sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  img.__set__('docker', mockDockerApi);

  describe('#pull()', function () {

    it('Should call Docker.pull with the correct args.', function () {
      // setup stubs
      var stubPull = sandbox.stub(mockDockerApi, 'pull', function (name, cb) {
        cb(null, mockStreamApi);
      }),
      stubOn = sandbox.stub(mockStreamApi, 'on');

      // run unit being tested
      img.pull(mockImage, function () {});

      // verify
      sinon.assert.calledWithExactly(stubPull, 'myimagename', sinon.match.func);
      sinon.assert.callCount(stubPull, 1);

      sinon.assert.calledWithExactly(stubOn, 'data', sinon.match.func);
      sinon.assert.calledWithExactly(stubOn, 'end', sinon.match.func);
      sinon.assert.callCount(stubOn, 2);
    });

    it('Should throw an error when Docker.pull returns an error.', function () {
      // setup stubs
      var stub = sandbox.stub(mockDockerApi, 'pull', function (name, cb) {
        cb(new Error('Test Error!'));
      });
      // run unit being tested
      var fn = function () { img.pull(mockImage, function () {}); };
      // verify
      expect(fn).to.throw('Test Error!');
    });

  });

  describe('#build()', function () {

    it('Should call Docker.buildImage with the correct args.', function () {
      // mocks
      var mockPath = {
        resolve: function () {}
      },
      mockProcess = {
        chdir: function () {}
      },
      mockFs = {
        createReadStream: function () {}
      },
      mockStream = {
        on: function () {}
      };

      // setup
      var stubBuildImage = sandbox.stub(mockDockerApi, 'buildImage',
        function (data, name, cb) {
          cb(null, mockStream);
      }),
      stubResolve = sandbox.stub(mockPath, 'resolve', path.join),
      stubChdir = sandbox.stub(mockProcess, 'chdir'),
      stubFs = sandbox.stub(mockFs, 'createReadStream'),
      stubOn = sandbox.stub(mockStream, 'on');

      // setup injected mocks
      img.__set__('path', mockPath);
      img.__set__('process', mockProcess);
      img.__set__('fs', mockFs);
      img.__set__('exec', function (cmd, cb) {
        cb(null, null, null);
      });

      // run unit being tested
      img.build(mockImage, function () {});

      // verify
      sinon.assert.calledWithExactly(stubResolve, '/my/path/1/', 'archive.tar');
      sinon.assert.callCount(stubResolve, 1);

      sinon.assert.calledWithExactly(stubChdir, '/my/path/1/');
      sinon.assert.callCount(stubChdir, 1);

      sinon.assert.calledWithExactly(stubFs, '/my/path/1/archive.tar');
      sinon.assert.callCount(stubFs, 1);

      sinon.assert.calledWithExactly(stubBuildImage,
        sinon.match.undefined,
        { t: 'myimagename' },
        sinon.match.func
      );
      sinon.assert.callCount(stubBuildImage, 1);

      sinon.assert.calledWithExactly(stubOn, 'data', sinon.match.func);
      sinon.assert.calledWithExactly(stubOn, 'end', sinon.match.func);
      sinon.assert.callCount(stubOn, 2);
    });

  });

});
