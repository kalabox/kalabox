'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var rewire = require('rewire');
var ctn = rewire('../lib/container.js');
var sinon = require('sinon');
var _ = require('lodash');

describe('container', function() {

  var cmp = {
      hostname: 'myhostname',
      cid: 'mycid',
      cname: 'mycname',
      app: {
        appname: 'myappname',
        appdomain: 'myappdomain',
        docker: {
          createContainer: function() {},
          getContainer: function() {}
        }
      },
      image: {
        name: 'myimagename'
      },
      createOpts: {
        foo: 'myfoo',
        bar: 'mybar'
      }
    };
  var mockDockerApi = {
      createContainer: function() {},
      getContainer: function() {}
    };

  ctn.__set__('docker', mockDockerApi);

  describe('#createOpts()', function() {

    it('Should return an object with correctly set properties.', function() {
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

  describe('#startOpts()', function() {

    it('Should return an object with correctly set properties.', function() {
      var opts = ctn.startOpts(cmp, cmp.createOpts);

      expect(opts).to.have.property('Hostname', 'myhostname');
      expect(opts).to.have.property('PublishAllPorts', true);
      expect(opts).to.have.property('foo', 'myfoo');
      expect(opts).to.have.property('bar', 'mybar');
    });

  });

  describe('#create()', function() {

    it('Should call Docker.createContainer with the correct args.', function() {
      var mock = sinon.mock(mockDockerApi);
      mock.expects('createContainer').once();
      ctn.create(cmp, function() {});
      mock.verify();
    });

  });

  describe('#actions', function() {

    var fakeDocker = {
        getContainer: function() {}
      };
    var fakeCmp = {
        cid: 'mycid6',
        app: {
          path: ''
        }
      };
    var fakeCtn = {
        start: function() {},
        stop: function() {},
        kill: function() {},
        remove: function() {},
      };
    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    [{
      name: 'start',
      fn: ctn.start
    }, {
      name: 'stop',
      fn: ctn.stop
    }, {
      name: 'kill',
      fn: ctn.kill
    }, {
      name: 'remove',
      fn: ctn.remove
    }].forEach(function(x) {

      describe('#' + x.name + '()', function() {

        it('Should call Docker.getContainer and .' + x.name + ' with the correct args.', function() {
          // create stubs
          var spyCb = sandbox.spy();
          var stubGetCtn = sandbox.stub(fakeDocker, 'getContainer', function() {
              return fakeCtn;
            });
          var stubAction = sandbox.stub(fakeCtn, x.name, function(a, b) {
              var fn = b ? b : a;
              fn(null, 'some data');
            });

          // setup modules
          ctn.__set__('docker', fakeDocker);

          // run unit being tested
          x.fn(fakeCmp, spyCb);

          // verify
          sinon.assert.callCount(stubGetCtn, 1);
          sinon.assert.calledWithExactly(stubGetCtn, 'mycid6');

          sinon.assert.callCount(spyCb, 1);
          sinon.assert.calledWithExactly(spyCb, 'some data');

        });
      });

    });

  });

  describe('#name module', function() {

    describe('#createBuiltIn()', function() {
      it('Should return a string set to the correct container name.', function() {
        var fn = function(appName, componentName, expected) {
          expect(
            ctn.name.createBuiltIn(appName, componentName)
          ).to.equal(expected);
        };
        fn('myapp1', 'mycmp3', 'kalabox_myapp1_mycmp3');
      });
    });

    describe('#createUserDefined()', function() {
      it('Should return a string set to the correct container name.', function() {
        var fn = function(appName, componentName, expected) {
          expect(
            ctn.name.createUserDefined(appName, componentName)
          ).to.equal(expected);
        };
        fn('myapp1', 'mycmp3', 'kb_myapp1_mycmp3');
      });
    });

    describe('#parse()', function() {
      it('Should return an object with the correct properties.', function() {
        // for some reason dockerode puts a space in front of container names
        var input = ' kb_foo-app_data';
        var expected = {
          prefix: 'kb',
          appName: 'foo-app',
          componentName: 'data'
        };
        expect(ctn.name.parse(input)).deep.to.equal(expected);
      });
      it('Should return null when name is not a kalabox name.', function() {
        var inputs = ['Bobs_burgers'];
        inputs.forEach(function(input) {
          expect(ctn.name.parse(input)).to.be.equal(null);
        });
      });
    });

    describe('#isUserDefined()', function() {
      it('Should return true for a user defined ctn name.', function() {
        var fn = function(input, expected) {
          var name = ctn.name.parse(input);
          expect(ctn.name.isUserDefined(name)).to.equal(expected, name);
        };
        fn('kb_bill_clinton', true);
        fn('kalabox_big_deal', false);
      });
    });

    describe('#isBuiltIn()', function() {
      it('Should return true for a built in ctn name.', function() {
        var fn = function(input, expected) {
          var name = ctn.name.parse(input);
          expect(ctn.name.isBuiltIn(name)).to.equal(expected, name);
        };
        fn('kb_tom_clancy', false);
        fn('kalabox_clive_cussler', true);
      });
    });

    describe('#isKalaboxName()', function() {
      it('Should return true for a kalabox ctn name.', function() {
        var fn = function(input, expected) {
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
