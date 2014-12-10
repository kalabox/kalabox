'use strict';

var expect = require('chai').expect;
var rewire = require('rewire');
var tasks = rewire('../lib/tasks.js');

describe('tasks module', function() {

  beforeEach(function() {
    tasks.init();
  });

  describe('#registerTask()', function() {

    it('should register a task properly.', function(done) {
      expect(tasks.getCount()).to.equal(0);
      var fn = function(done) { done(); };
      tasks.registerTask(['a', 'b', 'c'], fn, 0);
      expect(tasks.getCount()).to.equal(1);
      var task = tasks.getTask(['a', 'b', 'c']);
      expect(task).to.not.equal(null);
      expect(task).to.not.equal(undefined);
      task.task(function() {
        done();
      });
    });

    it('should only need one name to register a task.', function(done) {
      var fn = function(done) { done(); };
      tasks.registerTask('d', fn);
      var task = tasks.getTask('d');
      task.task(function() {
        done();
      });
    });

  });

  describe('#findNode()', function() {
    it('should search for and return the correct node.', function(done) {
      var task = tasks.findNode('c');
      task.task(function() {
        done();
      });
    });
  });

  describe('#getTask()', function() {
    it('should return null if a task does not exist.', function() {
      var task = tasks.getTask('e');
      expect(task).to.equal(null);
    });
  });

  describe('#prettyPrint()', function() {
    it('should print the correct string to stdout.', function() {
      tasks.init();
      var result = '';
      var fakeConsole = {
        log: function(s) { result += s; }
      };
      var expected = 'a\n    b\n        |--> c\n|--> d\n';
      var restore = tasks.__set__('console', fakeConsole);
      tasks.prettyPrint();
      restore();
      expect(result).to.equal(expected);
    });
  });

});
