'use strict';

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
  validateRegex: /^[a-z][a-z0-9\-]*$/,
  isValidPart: function(part) {
    var searchIndex = part.search(this.validateRegex);
    return searchIndex >= 0;
  },
  validatePart: function(part) {
    if (!this.isValidPart(part)) {
      throw new Error('Invalid name part [' + part + ']');
    }
  }
};
