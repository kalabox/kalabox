'use strict';

/**
 * This contains a promisified confirmation question
 */

module.exports = function(kbox) {

  // Npm modules
  var inquirer = require('inquirer');

  // Kbox modules
  var Promise = require('bluebird');

  /*
   * Make sure the user wants to proceed with the install/update
   */
  return function(state) {

    // Set up our confirmation question
    var confirm = {
      type: 'confirm',
      name: 'doit',
      message: 'Install all the magic and get this party started?',
      when: function(answers) {
        return !state.nonInteractive;
      }
    };

    // Kick off a promise for this
    return new Promise(function(resolve) {
      return inquirer.prompt([confirm], function(answers) {

        // Log our answers
        state.log.debug('USER INPUT => ' + JSON.stringify(answers));

        // Return our answers
        return resolve(answers);

      });
    });

  };

};
