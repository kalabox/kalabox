'use strict';

module.exports = function(a, b, c) {
  return {
    test: function() {
      return [a, b, c].join('-');
    }
  };
};
