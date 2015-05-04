'use strict';

module.exports = function(kbox) {

  var _ = require('lodash');

  kbox.tasks.add(function(task) {
    task.path = ['query'];
    task.description = 'Run a command against a container.';
    task.kind = 'argv*';
    task.func = function(done) {
      var container = _.head(this.payload);
      var cmd = _.tail(this.payload);
      var stdout = process.stdout;
      var stderr = process.stderr;
      kbox.engine.query(container, cmd, stdout, stderr, function(err) {
        if (err) {
          return done(err);
        }
        process.stdout.on('end', done);
      });
    };
  });

};
