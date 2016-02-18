/**
 * Core functionality for Kalabox.
 *
 * @name core
 */

'use strict';

/**
 * Configuration handling for Kalabox.
 *
 * {@link #config|Read more}
 */
exports.config = require('./core/config.js');

/**
 * Dependency handling for Kalabox.
 *
 * {@link #deps|Read more}
 */
exports.deps = require('./core/deps.js');

/**
 * Environmental handling for Kalabox.
 *
 * {@link #env|Read more}
 */
exports.env = require('./core/env.js');

/**
 * Event handling for Kalabox.
 *
 * {@link #events|Read more}
 */
exports.events = require('./core/events.js');

/**
 * Logging for Kalabox.
 *
 * {@link #log|Read more}
 */
exports.log = require('./core/log.js');

/**
 * Task handling for Kalabox.
 *
 * {@link #tasks|Read more}
 */
exports.tasks = require('./core/tasks.js');
