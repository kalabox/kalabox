'use strict';

var rewire = require('rewire'),
  img = rewire('../lib/image.js'),
  expect = require('chai').expect,
  path = require('path'),
  sinon = require('sinon');

describe('image.js', function () {
  
  var mock_image = {
    name: 'myimagename',
    src: '/my/path/1/'
  },
  mock_docker_api = {
    buildImage: function () {},
    pull: function () {}
  },
  mock_stream_api = {
    on: function () {}
  },
  sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  img.__set__('docker', mock_docker_api);

  describe('#pull()', function () {

    it('Should call Docker.pull with the correct args.', function () {
      // setup stubs
      var stub_pull = sandbox.stub(mock_docker_api, 'pull', function (name, cb) {
        cb(null, mock_stream_api);
      }),
      stub_on = sandbox.stub(mock_stream_api, 'on');
      
      // run unit being tested
      img.pull(mock_image, function () {});

      // verify
      sinon.assert.calledWithExactly(stub_pull, 'myimagename', sinon.match.func);
      sinon.assert.callCount(stub_pull, 1);

      sinon.assert.calledWithExactly(stub_on, 'data', sinon.match.func);
      sinon.assert.calledWithExactly(stub_on, 'end', sinon.match.func);
      sinon.assert.callCount(stub_on, 2);
    });

    it('Should throw an error when Docker.pull returns an error.', function () {
      // setup stubs
      var stub = sandbox.stub(mock_docker_api, 'pull', function (name, cb) {
        cb(new Error('Test Error!'));
      });
      // run unit being tested
      var fn = function () { img.pull(mock_image, function () {}); };
      // verify
      expect(fn).to.throw('Test Error!');
    });

  });

  describe('#build()', function () {

    it('Should call Docker.buildImage with the correct args.', function () {
      // mocks
      var mock_path = {
        resolve: function () {}
      },
      mock_process = {
        chdir: function () {}
      },
      mock_fs = {
        createReadStream: function () {}
      },
      mock_stream = {
        on: function () {}
      };

      // setup
      var stub_buildImage = sandbox.stub(mock_docker_api, 'buildImage',
        function (data, name, cb) {
          cb(null, mock_stream);
      }),
      stub_resolve = sandbox.stub(mock_path, 'resolve', path.join),
      stub_chdir = sandbox.stub(mock_process, 'chdir'),
      stub_fs = sandbox.stub(mock_fs, 'createReadStream'),
      stub_on = sandbox.stub(mock_stream, 'on');

      // setup injected mocks
      img.__set__('path', mock_path);
      img.__set__('process', mock_process);
      img.__set__('fs', mock_fs);
      img.__set__('exec', function (cmd, cb) {
        cb(null, null, null);
      });

      // run unit being tested
      img.build(mock_image, function () {});

      // verify
      sinon.assert.calledWithExactly(stub_resolve, '/my/path/1/', 'archive.tar');
      sinon.assert.callCount(stub_resolve, 1);

      sinon.assert.calledWithExactly(stub_chdir, '/my/path/1/');
      sinon.assert.callCount(stub_chdir, 1);

      sinon.assert.calledWithExactly(stub_fs, '/my/path/1/archive.tar');
      sinon.assert.callCount(stub_fs, 1);

      sinon.assert.calledWithExactly(stub_buildImage,
        sinon.match.undefined,
        { t: 'myimagename' },
        sinon.match.func
      );
      sinon.assert.callCount(stub_buildImage, 1);

      sinon.assert.calledWithExactly(stub_on, 'data', sinon.match.func);
      sinon.assert.calledWithExactly(stub_on, 'end', sinon.match.func);
      sinon.assert.callCount(stub_on, 2);
    });
    
  });

});
