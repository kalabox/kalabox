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
      var result = tasks.getTask(['a', 'b', 'c']);
      expect(result.task).to.not.equal(null);
      expect(result.task).to.not.equal(undefined);
      result.task.task(function() {
        done();
      });
    });

    it('should only need one name to register a task.', function(done) {
      var fn = function(done) { done(); };
      tasks.registerTask('d', fn);
      var result = tasks.getTask('d');
      result.task.task(function() {
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

    it('should return the task and remaining names.', function() {
      var result = tasks.getTask(['a', 'b', 'c', 'd', '-v']);
      console.log(JSON.stringify(result));
      expect(result).to.have.deep.property('task');
      expect(result.args).to.deep.equal(['d', '-v']);
    });

  });

  describe('#prettyPrint()', function() {
    it('should print the correct string to stdout.', function() {
      tasks.init();
      var result = '';
      var fakeConsole = {
        log: function(s) { result += s; }
      };
      var expected = 'a\n    b\n        c\nd\n';
      var restore = tasks.__set__('console', fakeConsole);
      tasks.prettyPrint();
      restore();
      expect(result).to.equal(expected);
    });
  });

});
