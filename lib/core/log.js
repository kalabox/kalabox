'use strict';

/*
 * This module is used to have a singleton instance of the Log class that can
 * be loaded directly from here or referenced as part of core.
 */

/*
 * Load Log class.
 */
var Log = require('../util/log.js');

/*
 * Create a singleton instance.
 */
var log = new Log();

/*
 * Export singleton instance.
 */
module.exports = log;
