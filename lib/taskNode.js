'use strict';

var TaskNode = function(name, children, task, sortIndex) {
  this.name = name;
  this.children = children;
  this.task = task;
  this.sortIndex = sortIndex;
};

TaskNode.compare = function(a, b) {
  if (a.sortIndex < b.sortIndex) {
    return -1;
  } else if (a.sortIndex === b.sortIndex) {
    return 0;
  } else {
    return 1;
  }
};

TaskNode.prototype.sortChildren = function() {
  if (this.children.length > 0) {
    this.children.sort(TaskNode.compare);
  }
};

TaskNode.prototype.isLeaf = function() {
  return this.children.length === 0;
};

TaskNode.prototype.addChild = function(name, task, sortIndex) {
  var child = new TaskNode(name, [], task, sortIndex);
  this.children.push(child);
  this.sortChildren();
  return child;
};

var _walk = function(node, parent, depth, callback) {
  callback(node, parent, depth);
  if (!node.isLeaf()) {
    for (var index in node.children) {
      var child = node.children[index];
      _walk(child, node, depth + 1, callback);
    }
  }
};

TaskNode.prototype.walk = function(callback) {
  _walk(this, null, 0, callback);
};

var createRoot = function() {
  return new TaskNode('root', [], null, 0);
};

module.exports = {
  createRoot: createRoot,
  TaskNode: TaskNode
};
