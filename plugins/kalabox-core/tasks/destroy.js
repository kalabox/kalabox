'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  // Npm modules
  var inquirer = require('inquirer');
  var chalk = require('chalk');

  kbox.whenAppRegistered(function(app) {

    kbox.tasks.add(function(task) {
      task.path = [app.name, 'destroy'];
      task.category = 'appAction';
      task.options.push({
        name: 'yes',
        alias: 'y',
        kind: 'boolean',
        description: 'Automatically answer affirmitive'
      });
      task.description = 'Completely destroys and removes an app.';
      task.func = function(done) {

        // Display ominous warning
        console.log(kbox.art.destroyWarn());

        // Needs to prompt?
        var confirmPrompt = !this.options.yes;

        // Set up our confirmation question if needed
        var confirm = {
          type: 'confirm',
          name: 'doit',
          message: 'So, are you still prepared to DESTROY?',
          when: function(answers) {
            return confirmPrompt;
          }
        };

        // Destroyer of worlds
        inquirer.prompt([confirm], function(answers) {
          // Destroy if confirmed
          if (answers.doit) {
            kbox.app.destroy(app, done);
          }
          // Print and exit
          else {
            console.log(chalk.green('WHEW! IMMINENT DESTRUCTION AVERTED!'));
            done();
          }

        });

      };
    });

  });

};
