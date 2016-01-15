'use strict';

/**
 * This contains a promisified confirmation question
 */

module.exports = function(kbox) {

  // NPM Modules
  var _ = require('lodash');

  /*
   * Validate admin commands
   */
  var validate = function(cmds) {

    // Check if this is an array
    if (!Array.isArray(cmds)) {
      return 'Invalid adminCommands: ' + cmds;
    }

    // Check if each cmd is a string
    cmds.forEach(function(cmd, index) {
      if (typeof cmd !== 'string' || cmd.length < 1) {
        return 'Invalid cmd index: ' + index + ' cmd: ' + cmd;
      }
    });

    // Looks like we good!
    return true;

  };

  /*
   * Check for various errors being reported on stderr.data but not stderr.err
   */
  var hasError = function(data) {

    // Potential errors to check for
    var errors = [
      'Error - The installer has detected that VirtualBox is still running.'
    ];

    // Return whether our data contains an error that should kill the thing
    return _.reduce(errors, function(ultimateTruth, error) {
      return ultimateTruth || _.includes(data, error);
    }, false);

  };

  /*
   * Run the admin commands
   */
  var run = function(adminCommands, state, callback) {

    // Validate the admin commands
    if (validate(adminCommands) !== true) {
      callback(new Error(validate(adminCommands)));
    }

    // Process admin commands.
    var child = kbox.util.shell.execAdminAsync(adminCommands, state);

    // Events
    // Output data
    child.stdout.on('data', function(data) {
      state.log.info(data);
    });
    // Callback when done
    child.stdout.on('end', function() {
      callback();
    });
    // Output stderr data.
    child.stderr.on('data', function(data) {
      // Check to see if we should fail this even
      // if its not being reported as an actual error
      if (hasError(data)) {
        state.fail(state, data);
      }
      else {
        state.log.info(data);
      }
    });
    // Fail the installer if we get an error
    child.stderr.on('error', function(err) {
      state.fail(state, err);
    });

  };

  return {
    run: run
  };

};
