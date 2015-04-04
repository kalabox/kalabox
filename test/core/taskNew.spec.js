'use strict';

var chai = require('chai');
var expect = chai.expect;
var m = require('../../lib/core/taskNew.js');

describe('CLI Task Module', function() {

  before(function() {

    m.registerTask(function(task) {
      task.path = ['a', 'b', 'd'];
      task.description = task.path.join('');
      task.func = function() {
        return task.description;
      };
    });

    m.registerTask(function(task) {
      task.path = ['a', 'b', 'c'];
      task.description = task.path.join('');
      task.func = function() {
        return task.description;
      };
    });

    m.registerTask(function(task) {
      task.path = ['a', 'x'];
      task.description = task.path.join('');
      task.func = function() {
        return task.description;
      };
    });

  });

  describe('#registerTask()', function() {

    it('Should add tasks to the task tree in the correct way.', function() {

      var root = m.getTaskTree();
      expect(root.__isBranch).to.equal(true);
      expect(root.name).to.equal('root');
      expect(root.children.length).to.equal(1);

      var a = root.children[0];
      expect(a.__isBranch).to.equal(true);
      expect(a.name).to.equal('a');
      expect(a.children.length).to.equal(2);

      var b = a.children[0];
      expect(b.__isBranch).to.equal(true);
      expect(b.name).to.equal('b');
      expect(b.children.length).to.equal(2);

      var c = b.children[0];
      expect(c.__isTask).to.equal(true);
      expect(c.path).to.deep.equal(['c']);
      var d = b.children[1];
      expect(d.__isTask).to.equal(true);
      expect(d.path).to.deep.equal(['d']);

      var x = a.children[1];
      expect(x.__isTask).to.equal(true);
      expect(x.path).to.deep.equal(['x']);

    });

  });

  describe('#find()', function() {

    var makeArgv = function(names) {
      return names;
    };

    it('should return null if no task exists.', function() {

      var root = m.getTaskTree();
      var argv = makeArgv(['not', 'a', 'real', 'task']);
      var result = m.find(root, argv);
      expect(result).to.equal(null);

    });

    it('should find the correct branch.', function() {

      var root = m.getTaskTree();
      var argv = makeArgv(['a']);
      var result = m.find(root, argv);
      expect(result).to.not.equal(null);
      expect(result.argv).to.deep.equal([]);
      expect(result.__isBranch).to.equal(true);

    });

    it('should find the correct task.', function() {

      var root = m.getTaskTree();
      var argv = makeArgv(['a', 'b', 'c']);
      var result = m.find(root, argv);
      expect(result).to.not.equal(null);
      expect(result.argv).to.deep.equal([]);
      expect(result.__isTask).to.equal(true);
      expect(result.func()).to.equal('abc');

    });

  });

  describe.skip('#getMenu()', function() {

    it('should return a string menu.', function() {

      var root = m.getTaskTree();
      var menuString = m.getMenu(root);
      var expected = 'a\n' +
        '    b\n' +
        '        c\n' +
        '        d\n' +
        '    x';
      expect(menuString).to.equal(expected);

    });

  });

});
