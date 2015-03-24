'use strict';

module.exports = function(app) {
  return {
    test: function() {
      return app.name;
    }
  };
};
