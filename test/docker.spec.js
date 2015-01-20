'use strict';

var expect = require('chai').expect;
var sinon = require('sinon');
var docker = require('../lib/engine/docker.js');

var fakeContainers = [
  'not_from_kalabox',
  'kb_myapp_db',
  'kb_myapp_data',
  'kb_myapp_web',
  'kalabox_hipache',
  'kalabox_dnsmasq',
  'kb_yourapp_db',
  'kb_yourapp_d7',
  'kb_yourapp_redis'
].map(function(name, index) {
  return {Names: ['/' + name], Id: index.toString()};
});
var fakeDockerode = {
  getContainer: function() {},
  listContainers: function() {}
};
var fakeContainer = {
  cid: '7',
  remove: function() {},
  stop: function() {}
};
var stubGetContainer = sinon.stub(fakeDockerode, 'getContainer', function(cid) {
  if (cid === '7') {
    return fakeContainer;
  } else {
    return null;
  }
});
var stubList = sinon.stub(
  fakeDockerode,
  'listContainers',
  function(opts, callback) {
    var err = null;
    var containers = fakeContainers;
    callback(err, containers);
  }
);
var stubStop = sinon.stub(fakeContainer, 'stop', function(callback) {
  var err = null;
  var data = 'some data';
  callback(err, data);
});
var stubRemove = sinon.stub(fakeContainer, 'remove', function(callback) {
  var err = null;
  var data = 'some more data'  ;
  callback(err, data);
});

describe.skip('docker module', function() {

  beforeEach(function() {
    docker.init(fakeDockerode);
  });

  afterEach(function() {
    docker.teardown();
  });

  describe('#applyOpt()', function() {
    it(
      'should call the objects correct method with the correct args.',
      function() {
        var obj = {
          doSomething: function() {}
        };
        var funcName = 'doSomething';
        var args = ['foo', 'bar', 7];
        var spy = sinon.spy(obj, funcName);
        docker.applyOpt(obj, funcName, args);
        sinon.assert.callCount(spy, 1);
        sinon.assert.calledWithExactly(spy, args[0], args[1], args[2]);
      }
    );
  });

  describe('#get()', function() {
    it(
      'should call dockerode.getContainer with the correct args and return ' +
      'the container.',
      function() {
        var cid = '7';
        var container = docker.get(cid);
        sinon.assert.callCount(stubGetContainer, 1);
        sinon.assert.calledWithExactly(stubGetContainer, cid);
        expect(container).to.have.deep.property('cid', '7');
      }
    );
  });

  describe('#stop()', function() {
    it('should call dockerode.stop with the correct args.', function(done) {
      var cid = '7'        ;
      docker.stop(cid, function(err, data) {
        expect(err).to.equal(null);
        expect(data).to.equal('some data');
        done();
      });
    });
  });

  describe('#remove()', function() {
    it('should call dockerode.remove with the correct args.', function(done) {
      var cid = '7';
      docker.remove(cid, function(err, data) {
        expect(err).to.equal(null);
        expect(data).to.equal('some more data');
        done();
      });
    });
  });

  describe('#list()', function() {
    it('should return a list of container objects', function(done) {
      docker.list(function(err, containers) {
        expect(containers.length).to.equal(6);
        var names = containers.map(function(container) {
          return container.name;
        });
        expect(names).to.deep.equal([
          'kb_myapp_db',
          'kb_myapp_data',
          'kb_myapp_web',
          'kb_yourapp_db',
          'kb_yourapp_d7',
          'kb_yourapp_redis'
        ]);
        done();
      });
    });
    it(
      'should return containers for a specific app if the app name is given',
      function(done) {
        docker.list('myapp', function(err, containers) {
          expect(containers.length).to.equal(3);
          var names = containers.map(function(container) {
            return container.name;
          });
          expect(names).to.deep.equal([
            'kb_myapp_db',
            'kb_myapp_data',
            'kb_myapp_web'
          ]);
          done();
        });
      }
    );
  });

});
