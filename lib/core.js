'use strict';

/*
 * Kalabox core module.
 */

var config = exports.config = require('./core/config.js');

var deps = exports.deps = require('./core/deps.js');

var env = exports.env = require('./core/env.js');

var events = exports.events = require('./core/events.js');

var log = exports.log = require('./core/log.js');

var mode = exports.mode = require('./core/mode.js');

var plugin = exports.plugin = require('./core/plugin.js');

var task = exports.task = require('./core/task.js');

var tasks = exports.tasks = require('./core/tasks.js');

var taskNode = exports.taskNode = require('./core/taskNode.js');
