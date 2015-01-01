'use strict';

/*
 * Kalabox util module.
 */

var fs = require('fs');

var disk = require('./util/disk.js');
exports.disk = disk;

var download = require('./util/download.js');
exports.download = download;

var firewall = require('./util/firewall.js');
exports.firewall = firewall;

var internet = require('./util/internet.js');
exports.internet = internet;

var shell = require('./util/shell.js');
exports.shell = shell;

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

var helperIdent = function(x) { return x; };

var helperFindMap = function(elts, filter, map) {
  var rec = function(elts) {
    if (elts.length === 0)  {
      return null;
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      if (filter(hd)) {
        return map(hd);
      } else {
        return rec(tl);
      }
    }
  };
  return rec(elts);
};

var helperFilterMap = function(elts, filter, map) {
  var rec = function(elts, results) {
    if (elts.length === 0) {
      return results;
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      if (filter(hd)) {
        results.push(map(hd));
      }
      return rec(tl, results);
    }
  };
  return rec(elts, []);
};

var helperFilterMap2 = function(elts, map) {
  var rec = function(elts, results) {
    if (elts.length === 0) {
      return results;
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      var result = map(hd);
      if (result !== null) {
        results.push(result);
      }
      return rec(tl, results);
    }
  };
  return rec(elts, []);
};

var helperFind = function(elts, filter) {
  return helperFindMap(elts, filter, helperIdent);
};

var helperFilter = function(elts, filter) {
  return helperFilterMap(elts, filter, helperIdent);
};

exports.searchForPath = function(pathsToSearch) {
  return helperFind(pathsToSearch, function(path) {
    return fs.existsSync(path);
  });
};

exports.helpers = {
  filter: helperFilter,
  filterMap: helperFilterMap,
  filterMap2: helperFilterMap2,
  find: helperFind,
  findMap: helperFindMap
};
