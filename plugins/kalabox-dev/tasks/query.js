'use strict';

module.exports = function(kbox) {

  var _ = require('lodash');

  kbox.tasks.add(function(task) {
    task.path = ['query'];
    task.category = 'dev';
    task.description = 'Run a command against a container.';
    task.kind = 'argv*';
    task.func = function(done) {
      var target = _.head(this.payload);
      var cmd = _.tail(this.payload);
      var stdout = process.stdout;
      var stderr = process.stderr;
      kbox.engine.query(target, cmd)
      .then(function(res) {
        res.stdout.pipe(process.stdout);
        res.stderr.pipe(process.stderr);
        return res.wait();
      })
      .nodeify(done);
    };
  });

};
