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
 * [Read more](#cli)
 * @memberof util
 */
var cli = require('./util/cli.js');
exports.cli = cli;

/**
 * Kalabox disk helpers.
 *
 * [Read more](#disk)
 * @memberof util
 */
var disk = require('./util/disk.js');
exports.disk = disk;

/**
 * Kalabox DNS helpers.
 *
 * [Read more](#dns)
 * @memberof util
 */
var dns = require('./util/dns.js');
exports.dns = dns;

/**
 * Kalabox docker helpers.
 *
 * [Read more](#docker)
 */
exports.docker = require('./util/docker.js');

/**
 * Kalabox download helpers.
 *
 * [Read more](#download)
 * @memberof util
 */
var download = require('./util/download.js');
exports.download = download;

/**
 * Kalabox domain helpers.
 *
 * [Read more](#domain)
 * @memberof util
 */
var domain = require('./util/domain.js');
exports.domain = domain;

/**
 * Kalabox firewall helpers.
 *
 * [Read more](#firewall)
 * @memberof util
 */
var firewall = require('./util/firewall.js');
exports.firewall = firewall;

/**
 * Kalabox internet helpers.
 *
 * [Read more](#internet)
 * @memberof util
 */
var internet = require('./util/internet.js');
exports.internet = internet;

/**
 * Kalabox linux helpers.
 *
 * [Read more](#linux)
 * @memberof util
 */
var linux = require('./util/linux.js');
exports.linux = linux;

/**
 * Kalabox package helpers.
 *
 * [Read more](#pkg)
 * @memberof util
 */
var pkg = require('./util/pkg.js');
exports.pkg = pkg;

/**
 * Kalabox shell helpers.
 *
 * [Read more](#shell)
 * @memberof util
 */
var shell = require('./util/shell.js');
exports.shell = shell;

/**
 * Kalabox windows helpers.
 *
 * [Read more](#windows)
 * @memberof util
 */
var windows = require('./util/windows.js');
exports.windows = windows;

/**
 * Kalabox yaml helpers.
 *
 * [Read more](#yaml)
 * @memberof util
 */
var yaml = require('./util/yaml.js');
exports.yaml = yaml;
