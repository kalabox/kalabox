'use strict';

var rewire = require('rewire');
var cmp = rewire('../lib/component.js');
var expect = require('chai').expect;
var sinon = require('sinon');

describe('component', function() {

  describe('#Constructor()', function() {

    var appApi = {
      appDomain: 'myappdomain',
      //cidPath: 'foo',
      dataContainerName: 'data',
      hasData: true,
      name: 'myapp1',
      config: {
        appCidsRoot: 'foo'
      }
    };
    var key = 'db';
    var cmpApi = {
      image: {
        build: false
      }
    };

    it('Should set the correct properties.', function() {

      var x = new cmp.Component(appApi, key, cmpApi);

      expect(x).to.have.property('key', 'db');
      expect(x).to.have.property('hostname', 'db.myappdomain');
      expect(x).to.have.property('url', 'http://db.myappdomain');
      expect(x).to.have.property('dataContainerName', 'data');
      expect(x).to.have.property('cname', 'kb_myapp1_db');
      expect(x).to.have.property('cidfile').to.match(/.*foo\/db$/);
    });

  });

  describe('#actions', function() {

    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    var fakeCmp = {
      app: {
        config: {
          appRoot: 'myAppRoot'
        },
        event: function() {}
      },
      cid: 'mycid',
      image: {
        name: 'foo'
      }
    };
    var fakeCtn = {
      create: function() {},
      start: function() {},
      stop: function() {},
      kill: function() {},
      remove: function() {}
    };

    [
      {name: 'create', fn: cmp.create, msg: 'init'},
      {name: 'start', fn: cmp.start, msg: 'start'},
      {name: 'stop', fn: cmp.stop, msg: 'stop'},
      {name: 'kill', fn: cmp.kill, msg: 'kill'},
      {name: 'remove', fn: cmp.remove, msg: 'remove'}
    ].forEach(function(x) {

      describe('#' + x.name + '()', function() {

        it('Should call container.' + x.name + '() with the correct args.', function() {

          // create stubs
          var spyEvent = sandbox.spy(fakeCmp.app, 'event');
          var spyCb = sandbox.spy();
          var stubFn;
          var isStart = x.name === 'start';
          var isCreate = x.name === 'create';
          if (isStart) {
            stubFn = sandbox.stub(fakeCtn, x.name, function(_1, _2, cb) { cb(); });
          } else {
            stubFn = sandbox.stub(fakeCtn, x.name, function(_1, cb) { cb(); });
          }

          // override modules
          cmp.__set__('container', fakeCtn);

          // run unit being tested
          x.fn(fakeCmp, spyCb);

          // verify
          if (isStart) {
            sinon.assert.calledWithExactly(stubFn, sinon.match.string, sinon.match.object, sinon.match.func);
          } else if (isCreate) {
            sinon.assert.calledWithExactly(stubFn, sinon.match.object, sinon.match.func);
          } else {
            sinon.assert.calledWithExactly(stubFn, sinon.match.string, sinon.match.func);
          }
          sinon.assert.callCount(stubFn, 1);

          sinon.assert.calledWithExactly(spyEvent, 'pre-' + x.msg + '-component', sinon.match.object);
          sinon.assert.calledWithExactly(spyEvent, 'post-' + x.msg + '-component', sinon.match.object);
          sinon.assert.callCount(spyEvent, 2);

          sinon.assert.calledWithExactly(spyCb, undefined, undefined);
          sinon.assert.callCount(spyCb, 1);

        });

      });

    });

  });

});
