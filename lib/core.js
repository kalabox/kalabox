/**
 * Core functionality for Kalabox.
 *
 * @name core
 */

'use strict';

/**
 * CLI caching for Kalabox.
 *
 * [Read more](#config)
 */
exports.config = require('./core/cache.js');

/**
 * Configuration handling for Kalabox.
 *
 * [Read more](#config)
 */
exports.config = require('./core/config.js');

/**
 * Dependency handling for Kalabox.
 *
 * [Read more](#deps)
 */
exports.deps = require('./core/deps.js');

/**
 * Environmental handling for Kalabox.
 *
 * [Read more](#env)
 */
exports.env = require('./core/env.js');

/**
 * Event handling for Kalabox.
 *
 * [Read more](#events)
 */
exports.events = require('./core/events.js');

/**
 * Logging for Kalabox.
 *
 * [Read more](#log)
 */
exports.log = require('./core/log.js');

/**
 * Task handling for Kalabox.
 *
 * [Read more](#tasks)
 */
exports.tasks = require('./core/tasks.js');
