'use strict';

var expect = require('chai').expect;
var kbox = require('../lib/kbox.js');
var taskNode = kbox.core.taskNode;

describe('taskNode module', function() {

  describe('#compare()', function() {

    function createNode(name, sortIndex) {
      return new taskNode.TaskNode(name, null, sortIndex);
    }

    function test(aSortIndex, bSortIndex, expected) {
      var a = createNode('a', aSortIndex);
      var b = createNode('b', bSortIndex);
      var result = taskNode.TaskNode.compareSortIndex(a, b);
      expect(result).to.equal(expected);
    }

    it('should return 1 if a.sortIndex > b.sortIndex.', function() {
      test(1, 0, 1);
    });

    it('should return 0 if a.sortIndex = b.sortIndex.', function() {
      test(3, 3, 0);
    });

    it('should return -1 if a.sortIndex < b.sortIndex.', function() {
      test(7, 12, -1);
    });

  });

  describe('#sortChildren()', function() {

    it('should properly sort a TaskNodes children.', function() {
      var tn = new taskNode.TaskNode('mynode', null, 0);
      tn.addChild('1', null, 2);
      tn.addChild('2', null, 3);
      tn.addChild('3', null, 1);
      var result = tn.children.map(function(child) { return child.name; });
      var expected = ['3', '1', '2'];
      expect(result).to.deep.equal(expected);
    });

    it('should not fail if there are no children.', function(done) {
      var tn = new taskNode.TaskNode('nodeynode', null, 0);
      tn.sortChildren();
      done();
    });

  });

  describe('#isLeaf()', function() {

    it('should return true if a TaskNode has no children.', function() {
      var tn = new taskNode.TaskNode('thenode', null, 0);
      var result = tn.isLeaf();
      var expected = true;
      expect(result).to.equal(expected);
    });

    it('should return false if a TaskNode has children.', function() {
      var tn = new taskNode.TaskNode('mynode', null, 7);
      tn.addChild('thechild', null, 0);
      var result = tn.isLeaf();
      var expected = false;
      expect(result).to.equal(expected);
    });

  });

  describe('#walk()', function() {
    it('should walk the tree correctly.', function() {
      var root = taskNode.createRoot();
      var a = root.addChild('a', null, 0);
      var b = root.addChild('b', null, 0);
      a.addChild('aa', null, 0);
      a.addChild('ab', null, 0);
      b.addChild('ba', null, 0);
      b.addChild('bb', null, 0);
      b.addChild('bc', null, 0);
      var result = [];
      var expected = [
        'root:0',
        'a:1',
        'aa:2',
        'ab:2',
        'b:1',
        'ba:2',
        'bb:2',
        'bc:2'
      ];
      root.walk(function(node, parent, depth) {
        result.push(node.name + ':' + depth);
      });
      expect(result).to.deep.equal(expected);
    });
  });

});
