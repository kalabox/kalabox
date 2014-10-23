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
    build: function () {},
    pull: function () {}
  };

  var mock = sinon.mock(mock_docker_api);
  img.__set__('docker', mock_docker_api);

  afterEach(function () {
    mock.restore();
  });

  describe('#pull()', function () {
    it('Should call Docker.pull with the correct args.', function () {
      var stub = sinon.stub(mock_docker_api, 'pull');

      img.pull(mock_image, mock_docker_api, function () {});

      sinon.assert.calledWith(stub, 'myimagename');
      sinon.assert.calledOnce(stub);
    });
  });

});
