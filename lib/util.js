/**
 * Kalabox utility helpers.
 *
 * @name util
 */

'use strict';

/**
 * Core node util.format method
 */
exports.format = require('util').format;

/**
 * Core node util.inspect method
 */
exports.pp = require('util').inspect;

/**
 * Kalabox CLI helpers.
 *
 * {@link #cli|Read more}
 * @memberof util
 */
var cli = require('./util/cli.js');
exports.cli = cli;

/**
 * Kalabox disk helpers.
 *
 * {@link #disk|Read more}
 * @memberof util
 */
var disk = require('./util/disk.js');
exports.disk = disk;

/**
 * Kalabox DNS helpers.
 *
 * {@link #dns|Read more}
 * @memberof util
 */
var dns = require('./util/dns.js');
exports.dns = dns;

/**
 * Kalabox docker helpers.
 *
 * {@link #docker|Read more}
 */
exports.docker = require('./util/docker.js');

/**
 * Kalabox download helpers.
 *
 * {@link #download|Read more}
 * @memberof util
 */
var download = require('./util/download.js');
exports.download = download;

/**
 * Kalabox domain helpers.
 *
 * {@link #domain|Read more}
 * @memberof util
 */
var domain = require('./util/domain.js');
exports.domain = domain;

/**
 * Kalabox firewall helpers.
 *
 * {@link #firewall|Read more}
 * @memberof util
 */
var firewall = require('./util/firewall.js');
exports.firewall = firewall;

/**
 * Kalabox internet helpers.
 *
 * {@link #internet|Read more}
 * @memberof util
 */
var internet = require('./util/internet.js');
exports.internet = internet;

/**
 * Kalabox linux helpers.
 *
 * {@link #linux|Read more}
 * @memberof util
 */
var linux = require('./util/linux.js');
exports.linux = linux;

/**
 * Kalabox package helpers.
 *
 * {@link #pkg|Read more}
 * @memberof util
 */
var pkg = require('./util/pkg.js');
exports.pkg = pkg;

/**
 * Kalabox shell helpers.
 *
 * {@link #shell|Read more}
 * @memberof util
 */
var shell = require('./util/shell.js');
exports.shell = shell;

/**
 * Kalabox windows helpers.
 *
 * {@link #windows|Read more}
 * @memberof util
 */
var windows = require('./util/windows.js');
exports.windows = windows;

/**
 * Kalabox yaml helpers.
 *
 * {@link #config|Read more}
 * @memberof util
 */
var yaml = require('./util/yaml.js');
exports.yaml = yaml;
