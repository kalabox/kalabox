'use strict';

var taskNode = require('./taskNode.js');
var Task = require('./task.js');

var root = null;

var init = function() {
  if (!root) {
    root = taskNode.createRoot();
  }
};
module.exports.init = init;

var findNode = function(name, nodeToSearch) {
  if (!nodeToSearch) {
    nodeToSearch = root;
  }
  var result = null;
  root.walk(function(node, parent, depth) {
    if (!result && name === node.name) {
      result = node;
    }
  });
  return result;
};
module.exports.findNode = findNode;

var getTask = function(names, parent) {
  if (!parent) {
    parent = root;
  }
  var fn = function(names, parent) {
    if (names.length === 0) {
      return parent;
    } else {
      var node = null;
      for (var index in parent.children) {
        var child = parent.children[index];
        if (!node && child.name === names[0]) {
          node = child;
        }
      }
      if (!node) {
        return null;
      } else {
        return fn(names.slice(1), node);
      }
    }
  };
  return fn(names, parent);
};
module.exports.getTask = getTask;

var wrapTask = function(name, cmd) {
  var fn = function() {
    var task = new Task(name, cmd);
    task.on('error', function(err) {
      console.log(err);
      throw err;
    });
    task.run();
  };
  return fn;
};

var registerTask = function(names, task, sortIndex) {
  if (typeof names === 'string') {
    names = [names];
  }
  if (!sortIndex) {
    sortIndex = 0;
  }
  var fn = function(names, parent) {
    var name = names[0];
    if (names.length === 1) {
      parent.addChild(name, wrapTask(name, task), sortIndex);
    } else {
      var node = findNode(name, parent);
      if (!node) {
        node = parent.addChild(name, null, sortIndex);
      }
      fn(names.slice(1), node);
    }
  };
  fn(names, root);
};
module.exports.registerTask = registerTask;

var walk = function(node, callback) {
  if (typeof node === 'function' && !callback) {
    callback = node;
    node = root;
  }
  node.walk(callback);
};
module.exports.walk = walk;

var prettyPrint = function(node) {
  if (!node) {
    node = root;
  }
  var acc = '';
  var makeSpaces = function(depth) {
    var length = (depth - 1) * 4;
    return new Array(length + 1).join(' ');
  };
  node.walk(function(node, parent, depth) {
    if (depth > 0) {
      //var parentInfo = parent ? '(' + parent.name + ')' : '';
      var parentInfo = '';
      var prefix = node.task ? '|--> ' : '';
      acc += makeSpaces(depth) + prefix + node.name + parentInfo + '\n';
    }
  });
  console.log(acc);
};
module.exports.prettyPrint = prettyPrint;
