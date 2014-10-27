'use strict';

exports.name = {
  delim: '_',
  create: function (parts) {
    this.validateParts(parts);
    return parts.join(this.delim);
  },
  parse: function (name) {
    var parts = name.split(this.delim);
    this.validateParts(parts);
    return parts;
  },
  validateParts: function (arr) {
    for (var i=0; i<arr.length; ++i) {
      this.validatePart(arr[i]);
    }
  },
  validateRegex: /^[a-z][a-z0-9\-]*$/,
  validatePart: function (part) {
    var searchIndex = part.search(this.validateRegex);
    if (searchIndex < 0) {
      throw new Error('Invalid name part [' + part + ']');
    }
  }
};
