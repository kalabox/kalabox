'use strict';

var validateNameRegex = function(min, max) {
  return new RegExp('^[a-z][a-z0-9\\-]{' + (min-1) + ',' + (max-1) + '}$');
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
