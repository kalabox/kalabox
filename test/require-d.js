module.exports = function(kbox, app) {
  return {
    test: function() {
      return app.name;
    }
  }
};
