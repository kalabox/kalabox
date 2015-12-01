'use strict';

/*
 * Kalabox util module.
 */

var fs = require('fs');

exports.format = require('util').format;

exports.pp = require('util').inspect;

// @todo: @bcauldwell do we need the below? doesn't seem to be called by anything
//var algo = require('./util/algo.js');
//exports.algo = algo;

var disk = require('./util/disk.js');
exports.disk = disk;

var dns = require('./util/dns.js');
exports.dns = dns;

exports.docker = require('./util/docker.js');

var download = require('./util/download.js');
exports.download = download;

var domain = require('./util/domain.js');
exports.domain = domain;

var firewall = require('./util/firewall.js');
exports.firewall = firewall;

var helpers = require('./util/helpers.js');
exports.helpers = helpers;

var internet = require('./util/internet.js');
exports.internet = internet;

var pkg = require('./util/pkg.js');
exports.pkg = pkg;

var shell = require('./util/shell.js');
exports.shell = shell;

exports.version = require('./util/version.js');

var validateNameRegex = function(min, max) {
  return new RegExp('^[a-z][a-z0-9\\-]{' + (min - 1) + ',' + (max - 1) + '}$');
};

exports.name = {
  delim: '_',
  create: function(parts) {
    for (var i = 0; i < parts.length; ++i) {
      this.validatePart(parts[i]);
    }
    return parts.join(this.delim);
  },
  parse: function(name) {
    var parts = name.split(this.delim);
    for (var i = 0; i < parts.length; ++i) {
      if (!this.isValidPart(parts[i])) {
        return null;
      }
    }
    return parts;
  },
  getValidateRegex: function() {
    var min = 1;
    var max = 12;
    return validateNameRegex(min, max);
  },
  isValidPart: function(part) {
    var searchIndex = part.search(this.getValidateRegex());
    return searchIndex >= 0;
  },
  validatePart: function(part) {
    if (!this.isValidPart(part)) {
      throw new Error('Invalid name part [' + part + ']');
    }
  }
};

exports.longname = {
  getValidateRegex: function() {
    var min = 3;
    var max = 20;
    return validateNameRegex(min, max);
  },
  isValid: function(longname) {
    return this.getValidateRegex().test(longname);
  }
};

exports.searchForPath = function(pathsToSearch) {
  return helpers.find(pathsToSearch, function(path) {
    return fs.existsSync(path);
  });
};
