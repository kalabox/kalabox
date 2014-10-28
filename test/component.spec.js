'use strict';

var rewire = require('rewire'),
  cmp = rewire('../lib/component.js'),
  expect = require('chai').expect,
  sinon = require('sinon');

describe('component.js', function () {

  describe('#Constructor()', function () {
    
    var app_api = {
      appdomain: 'myappdomain',
      cidPath: 'foo',
      dataCname: 'data',
      hasData: true,
      prefix: 'myapp1'
    },
    key = 'db',
    cmp_api = {
      image: {
        build: false
      }
    };

    it('Should set the correct properties.', function() {

      var x = new cmp.Component(app_api, key, cmp_api);

      expect(x).to.have.property('key', 'db');
      expect(x).to.have.property('hostname', 'db.myappdomain');
      expect(x).to.have.property('url', 'http://db.myappdomain');
      expect(x).to.have.property('dataCname', 'data');
      expect(x).to.have.property('cname', 'kb_myapp1db');
      expect(x).to.have.property('cidfile').to.match(/.*\/foo\/db$/);
    });

  });

  describe('#actions', function () {

    var sandbox;

    beforeEach(function () {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
      sandbox.restore();
    });

    var fake_cmp = {
      app: {
        event: function () {}
      }
    },
    fake_ctn = {
      create: function () {},
      start: function () {},
      stop: function () {},
      kill: function () {},
      remove: function () {}
    };

    [
      { name: 'create', fn: cmp.create, msg: 'init' },
      { name: 'start', fn: cmp.start, msg: 'start' },
      { name: 'stop', fn: cmp.stop, msg: 'stop' },
      { name: 'kill', fn: cmp.kill, msg: 'kill' },
      { name: 'remove', fn: cmp.remove, msg: 'remove' }
    ].forEach(function (x) {

      describe('#' + x.name + '()', function () {

        it('Should call container.' + x.name + '() with the correct args.', function () {
          
          // create stubs
          var spy_event = sandbox.spy(fake_cmp.app, 'event'),
          spy_cb = sandbox.spy(),
          stub_fn = sandbox.stub(fake_ctn, x.name, function (_, cb) { cb(); });

          // override modules
          cmp.__set__('container', fake_ctn);

          // run unit being tested
          x.fn(fake_cmp, spy_cb);    

          // verify
          sinon.assert.calledWithExactly(stub_fn, sinon.match.object, sinon.match.func);
          sinon.assert.callCount(stub_fn, 1);

          sinon.assert.calledWithExactly(spy_event, 'pre-' + x.msg + '-component', sinon.match.object);
          sinon.assert.calledWithExactly(spy_event, 'post-' + x.msg + '-component', sinon.match.object);
          sinon.assert.callCount(spy_event, 2);

          sinon.assert.calledWithExactly(spy_cb);
          sinon.assert.callCount(spy_cb, 1);

        });

      });

    });

  });

});
