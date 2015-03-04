'use strict';

var rewire = require('rewire');
var docker = rewire('../../lib/engine/docker.js');
var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var sinon = require('sinon');
var _ = require('lodash');
var kbox = require('../../lib/kbox.js');

describe('docker module', function() {

  before(function() {
    var globalConfig = kbox.core.config.getGlobalConfig();
    kbox.core.deps.registerIf('globalConfig', globalConfig);
  });

  var fakeDocker = {
    getContainer: function(cid) {
      if (cid === '7') {
        return {
          Id: cid,
          Names: []
        };
      } else {
        console.log(cid);
        assert(false);
      }
    }
  };

  describe('#get()', function() {
    it('should call docker.getContainer with the correct cid', function(done) {
      var container = {
        Id: '7',
        Names: [' kb_some_container']
      };
      var fakeDocker = {
        getContainer: function() {},
        listContainers: function(filter, cb) {
          cb(null, [container]);
        }
      };
      var spy = sinon.stub(fakeDocker, 'getContainer', function(cid) {
        if (cid === '7') {
          return container;
        } else {
          assert(false);
        }
      });
      docker.__with__({docker: fakeDocker})(function() {
        docker.get('7', function(err, container) {
          expect(err).to.equal(null);
          sinon.assert.calledWithExactly(spy, '7');
          done();
        });
      });
    });
  });

  describe('#inspect()', function() {
    it('should call container.inspect.', function(done) {
      var container = {
        inspect: function() {}
      };
      var stub = sinon.stub(container, 'inspect', function(callback) {
        callback(null, {data: 'someData'});
      });
      docker.inspect(container, function(err, data) {
        expect(err).to.equal(null);
        expect(data).to.not.equal(null);
        sinon.assert.calledWithExactly(stub, sinon.match.func);
        done();
      });
    });
  });

  describe('#parseDockerContainerName()', function() {
    var fn = docker.__get__('parseDockerContainerName');
    it('should return an expected object with the correct values.', function() {
      var dockerContainerName = 'kb_myapp_web';
      var result = fn(dockerContainerName);
      var expected = {
        prefix: 'kb',
        app: 'myapp',
        name: 'web'
      };
      expect(result).to.deep.equal(expected);
    });
    it('should return null in an invalid container name is given.', function() {
      expect(fn('foo_bar_bazz')).to.equal(null);
      expect(fn('kb_oneword')).to.equal(null);
    });
  });

  describe('#cleanupDockerContainerName()', function() {
    it('should strip certain characters from the front of a name.', function() {
      var fn = docker.__get__('cleanupDockerContainerName');
      expect(fn('/one')).to.equal('one');
      expect(fn(' two')).to.equal('two');
      expect(fn('/ three')).to.equal(' three');
      expect(fn('four')).to.equal('four');
    });
  });

  describe('#toGenericContainer()', function() {
    var fn = docker.__get__('toGenericContainer');
    it('should return an expected generic container object.', function() {
      var fake = {
        Id: 'theContainerId',
        Names: [' kb_theapp_data']
      };
      var result = fn(fake);
      var expected = {
        id: 'theContainerId',
        name: 'kb_theapp_data',
        app: 'theapp'
      };
      expect(result).to.deep.equal(expected);
    });
    it(
      'should return null if given a non kalabox container object.',
      function() {
        var fake = {
          Id: 'someContainerId',
          Names: [' testcontainer']
        };
        var result = fn(fake);
        expect(result).to.equal(null);
      }
    );
  });

  var createFakeDocker = function(containers) {
    return {
      containers: containers,
      createContainer: function(createOptions, cb) {
        cb(null, {id: '3'});
      },
      getContainer: function(cid) {
        return _.find(containers, function(container) {
          return container.Id === cid;
        });
      },
      listContainers: function(filter, cb) {
        assert(filter.all === 1);
        cb(null, containers);
      }
    };
  };
  var createFakeContainer = function(cid, name, isRunning) {
    return {
      Id: cid,
      Names: [name],
      inspect: function(cb) { cb(null, {State: {Running: isRunning}}); },
      remove: function(opts, cb) {
        if (opts && !cb) {
          cb = opts;
        }
        cb(null);
      },
      start: function(startOptions, cb) {cb(null); },
      stop: function(cb) { cb(null); }
    };
  };

  var defaultFakeContainers = [
    createFakeContainer('1', 'kb_myapp_web', false),
    createFakeContainer('2', 'kb_myapp_db', true)
  ];
  var defaultFakeDocker = createFakeDocker(defaultFakeContainers);
  var __with = function(cb) {
    docker.__with__({docker:defaultFakeDocker})(cb);
  };

  describe('#list()', function() {
    it('should correctly list containers.', function(done) {
      __with(function() {
        docker.list(function(err, containers) {
          expect(err).to.equal(null);
          expect(containers.length).to.equal(2);
          done();
        });
      });
    });
  });

  describe('#create()', function() {

    var spyCreate = sinon.spy(defaultFakeDocker, 'createContainer');

    it(
      'should call docker.createContainer with the correct args.',
      function(done) {
        __with(function() {
          var createOpts = {name: 'myContainer3'};
          docker.create(createOpts, function(err, container) {
            expect(err).to.equal(null);
            sinon.assert.callCount(spyCreate, 1);
            expect(container).to.have.property('cid', '3');
            expect(container).to.have.property('name', createOpts.name);
            done();
          });
        });
      }
    );

  });

  describe('#start()', function() {

    var spyStart1 = sinon.spy(defaultFakeDocker.getContainer('1'), 'start');
    var spyStart2 = sinon.spy(defaultFakeDocker.getContainer('2'), 'start');

    it(
      'should not start the container if its already running.',
      function(done) {
        __with(function() {
          docker.start('2', function(err) {
            expect(err).to.equal(null);
            sinon.assert.callCount(spyStart2, 0);
            done();
          });
        });
      });

    it('should start the container.', function(done) {
      __with(function() {
        docker.start('1', function(err) {
          expect(err).to.equal(null);
          sinon.assert.callCount(spyStart1, 1);
          done();
        });
      });
    });

  });

  describe('#stop()', function() {

    var spyStop1 = sinon.spy(defaultFakeDocker.getContainer('1'), 'stop');
    var spyStop2 = sinon.spy(defaultFakeDocker.getContainer('2'), 'stop');

    it('should not stop a container if its already stopped.', function(done) {
      __with(function() {
        docker.stop('1', function(err) {
          expect(err).to.equal(null);
          sinon.assert.callCount(spyStop1, 0);
          done();
        });
      });
    });

    it('should stop a container.', function(done) {
      __with(function() {
        docker.stop('2', function(err) {
          expect(err).to.equal(null);
          sinon.assert.callCount(spyStop2, 1);
          done();
        });
      });
    });

  });

  describe('#remove()', function() {

    var spyRemove1 = sinon.spy(defaultFakeDocker.getContainer('1'), 'remove');
    var spyRemove2 = sinon.spy(defaultFakeDocker.getContainer('2'), 'remove');

    it('should remove a container if it is not running.', function(done) {
      __with(function() {
        docker.remove('1', function(err) {
          expect(err).to.equal(null);
          sinon.assert.callCount(spyRemove1, 1);
          done();
        });
      });
    });

    it('should return an error if the container is running.', function(done) {
      __with(function() {
        docker.remove('2', function(err) {
          expect(err).to.not.equal(null);
          expect(err.message).to.match(
            /The container "2" can NOT be removed, it is still running./
          );
          sinon.assert.callCount(spyRemove2, 0);
          done();
        });
      });
    });

    it(
      'should remove a container, but call stop first if it is running.',
      function(done) {
        __with(function() {
          docker.remove('2', {kill: true}, function(err) {
            expect(err).to.equal(null);
            sinon.assert.callCount(spyRemove2, 1);
            done();
          });
        });
      }
    );

  });

});
