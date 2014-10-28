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

  describe('#actions', function () {

    var fake_docker = {
      getContainer: function () {}
    },
    fake_cmp = {
      cid: 'mycid6',
      app: {
        path: ''
      }
    },
    fake_ctn = {
      start: function () {},
      stop: function () {},
      kill: function () {},
      remove: function () {},
    },
    sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
      sandbox.restore();
    });

    [
      { name: 'start', fn: ctn.start},
      { name: 'stop', fn: ctn.stop},
      { name: 'kill', fn: ctn.kill},
      { name: 'remove', fn: ctn.remove}
    ].forEach(function (x) {
      
      describe('#' + x.name + '()', function () {

        it('Should call Docker.getContainer and .' + x.name + ' with the correct args.', function () {
          // create stubs
          var spy_cb = sandbox.spy(),
          stub_getCtn = sandbox.stub(fake_docker, 'getContainer', function () { 
            return fake_ctn
          }),
          stub_action = sandbox.stub(fake_ctn, x.name, function (a, b) {
            var fn = b ? b : a;
            fn(null, 'some data');
          });

          // setup modules
          ctn.__set__('docker', fake_docker);

          // run unit being tested
          x.fn(fake_cmp, spy_cb);

          // verify
          sinon.assert.callCount(stub_getCtn, 1);
          sinon.assert.calledWithExactly(stub_getCtn, 'mycid6');

          sinon.assert.callCount(spy_cb, 1);
          sinon.assert.calledWithExactly(spy_cb, 'some data');

        });
      });

    });

  });

  describe('#name module', function () {

    describe('#createBuiltIn()', function () {
      it('Should return a string set to the correct container name.', function () {
        var fn = function (app_name, component_name, expected) {
          expect(
            ctn.name.createBuiltIn(app_name, component_name)
          ).to.equal(expected);
        };
        fn('myapp1', 'mycmp3', 'kalabox_myapp1_mycmp3');
      });
    });

    describe('#createUserDefined()', function () {
      it('Should return a string set to the correct container name.', function () {
        var fn = function (app_name, component_name, expected) {
          expect(
            ctn.name.createUserDefined(app_name, component_name)
          ).to.equal(expected);
        };
        fn('myapp1', 'mycmp3', 'kb_myapp1_mycmp3');
      });
    });

    describe('#parse()', function () {
      it('Should return an object with the correct properties.', function () {
        // for some reason dockerode puts a space in front of container names
        var input = ' kb_foo-app_data';
        var expected = {
          prefix: 'kb',
          app_name: 'foo-app',
          component_name: 'data'
        };
        expect(ctn.name.parse(input)).deep.to.equal(expected);
      });
      it('Should return null when name is not a kalabox name.', function () {
        var inputs = ['Bobs_burgers'];
        inputs.forEach(function (input) {
          expect(ctn.name.parse(input)).to.be.equal(null);
        });
      });
    });

    describe('#isUserDefined()', function () {
      it('Should return true for a user defined ctn name.', function () {
        var fn = function (input, expected) {
          var name = ctn.name.parse(input);
          expect(ctn.name.isUserDefined(name)).to.equal(expected, name);
        };
        fn('kb_bill_clinton', true);
        fn('kalabox_big_deal', false);
      });
    });

    describe('#isBuiltIn()', function () {
      it('Should return true for a built in ctn name.', function () {
        var fn = function (input, expected) {
          var name = ctn.name.parse(input);
          expect(ctn.name.isBuiltIn(name)).to.equal(expected, name);
        };
        fn('kb_tom_clancy', false);
        fn('kalabox_clive_cussler', true);
      });
    });

    describe('#isKalaboxName()', function () {
      it('Should return true for a kalabox ctn name.', function () {
        var fn = function (input, expected) {
          var name = ctn.name.parse(input);
          expect(ctn.name.isKalaboxName(name)).to.equal(expected, name);
        };
        fn('kb_betty_grable', true);
        fn('kalabox_tom_petty', true);
        fn('uneven_pavement', false);
      });
    });
    
  });

});
