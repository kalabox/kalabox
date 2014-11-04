'use strict';

var rewire = require('rewire'),
  cmp = rewire('../lib/component.js'),
  expect = require('chai').expect,
  sinon = require('sinon');

describe('component', function () {

  describe('#Constructor()', function () {

    var appApi = {
      appdomain: 'myappdomain',
      cidPath: 'foo',
      dataCname: 'data',
      hasData: true,
      prefix: 'myapp1'
    },
    key = 'db',
    cmpApi = {
      image: {
        build: false
      }
    };

    it('Should set the correct properties.', function() {

      var x = new cmp.Component(appApi, key, cmpApi);

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

    var fakeCmp = {
      app: {
        event: function () {}
      }
    },
    fakeCtn = {
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
          var spyEvent = sandbox.spy(fakeCmp.app, 'event'),
          spyCb = sandbox.spy(),
          stubFn = sandbox.stub(fakeCtn, x.name, function (_, cb) { cb(); });

          // override modules
          cmp.__set__('container', fakeCtn);

          // run unit being tested
          x.fn(fakeCmp, spyCb);

          // verify
          sinon.assert.calledWithExactly(stubFn, sinon.match.object, sinon.match.func);
          sinon.assert.callCount(stubFn, 1);

          sinon.assert.calledWithExactly(spyEvent, 'pre-' + x.msg + '-component', sinon.match.object);
          sinon.assert.calledWithExactly(spyEvent, 'post-' + x.msg + '-component', sinon.match.object);
          sinon.assert.callCount(spyEvent, 2);

          sinon.assert.calledWithExactly(spyCb);
          sinon.assert.callCount(spyCb, 1);

        });

      });

    });

  });

});
