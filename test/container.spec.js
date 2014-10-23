'use strict';

var assert = require('chai').assert,
  expect = require('chai').expect,
  rewire = require('rewire'),
  ctn = rewire('../lib/container.js'),
  sinon = require('sinon'),
  _ = require('lodash');

describe('container.js', function () {

  var cmp = {
    hostname: 'myhostname' ,
    cid: 'mycid',
    cname: 'mycname',
    app: {
      appname: 'myappname',
      appdomain: 'myappdomain',
      docker: {
        createContainer: function () {},
        getContainer: function () {}
      }
    },
    image: {
      name: 'myimagename'
    },
    createOpts: {
      foo: 'myfoo',
      bar: 'mybar'
    }
  },
  mock_docker_api = {
    createContainer: function () {},
    getContainer: function () {}
  };

  ctn.__set__('docker', mock_docker_api);

  describe('#createOpts()', function () {

    it('Should return an object with correctly set properties.', function () {
      var opts = ctn.createOpts(cmp);

      expect(opts).to.have.property('Hostname', 'myhostname');
      expect(opts).to.have.property('name', 'mycname');
      expect(opts).to.have.property('Image', 'myimagename');
      expect(opts).to.have.property('Dns').deep.to.equal(['8.8.8.8', '8.8.4.4']);
      expect(opts).to.have.property('Env').deep.to.equal(['APPNAME=myappname', 'APPDOMAIN=myappdomain']);
      expect(opts).to.have.property('foo', 'myfoo');
      expect(opts).to.have.property('bar', 'mybar');
   });

  });

  describe('#startOpts()', function () {

    it('Should return an object with correctly set properties.', function () {
      var opts = ctn.startOpts(cmp, cmp.createOpts);

      expect(opts).to.have.property('Hostname', 'myhostname');
      expect(opts).to.have.property('PublishAllPorts').to.be.true;
      expect(opts).to.have.property('foo', 'myfoo');
      expect(opts).to.have.property('bar', 'mybar');
   });

  });

  describe('#create()', function () {
  
    it('Should call Docker.createContainer with the correct args.', function () {
      var mock = sinon.mock(mock_docker_api);
      mock.expects('createContainer').once();
      ctn.create(cmp, function () {});
      mock.verify();
    });
    
  });

  describe('#actions...', function () {

    var mock_ctn_api = {
      start: function () {},
      stop: function () {},
      kill: function () {},
      remove: function () {}
    },
    getCtn = function () { return mock_ctn_api },
    mock_ctn = sinon.mock(mock_ctn_api),
    stub_docker = sinon.stub(mock_docker_api, 'getContainer', getCtn);

    afterEach(function () {
      stub_docker.reset();
      mock_ctn.restore();
    });

    var run_test = function (name, fn) {
      
      describe('#' + name + '()', function () {
        it('Should call Docker.getContainer and .' + name + ' with the correct args.', function () {
          mock_ctn.expects(name).once();
          fn(cmp, function () {});
          sinon.assert.calledWithExactly(stub_docker, 'mycid');
          sinon.assert.calledOnce(stub_docker);
          mock_ctn.verify();
        });
      });

    };

    var tests = [
      ['start', ctn.start],
      ['stop', ctn.stop],
      ['kill', ctn.kill],
      ['remove', ctn.remove]
    ];

    _.map(tests, function (args) {
      run_test(args[0], args[1])      ;
    });

  });

});
