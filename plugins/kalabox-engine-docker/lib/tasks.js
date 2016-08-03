'use strict';

module.exports = function(kbox) {

  var chalk = require('chalk');

  var engine = kbox.engine;
  var events = kbox.core.events.context();

  // Start the engine
  kbox.tasks.add(function(task) {
    task.path = ['up'];
    task.description = 'Bring Kalabox engine up';
    task.func = function() {

      // Events
      events.on('post-engine-up', function(done) {
        console.log(chalk.green('Kalabox engine has been activated'));
        done();
      });

      return engine.up();

    };
  });

  // Stop the kalabox engine
  kbox.tasks.add(function(task) {

    task.path = ['down'];
    task.description = 'Bring Kalabox engine down';
    task.func = function() {

      // Events
      events.on('post-engine-down', function(done) {
        console.log(chalk.red('Kalabox engine has been deactivated.'));
        done();
      });

      return engine.down();

    };
  });

  // Display status of engine.
  kbox.tasks.add(function(task) {
    task.path = ['status'];
    task.description = 'Display status of Kalabox engine';
    task.func = function(done) {
      engine.provider().call('isUp')
      .then(function(isUp) {
        return isUp ? 'up' : 'down';
      })
      .then(console.log)
      .nodeify(done);
    };
  });

};
