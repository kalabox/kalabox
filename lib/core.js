'use strict';

/*
 * Kalabox core module.
 */

var config = require('./core/config.js');
exports.config = config;

var deps = require('./core/deps.js');
exports.deps = deps;

var env = require('./core/env.js');
exports.env = env;

var events = require('./core/events.js');
exports.events = events;

var plugin = require('./core/plugin.js');
exports.plugin = plugin;

var task = require('./core/task.js');
exports.task = task;

var tasks = require('./core/tasks.js');
exports.tasks = tasks;

var taskNode = require('./core/taskNode.js');
exports.taskNode = taskNode;
