'use strict';

/**
 * This contains a promisified confirmation question
 */

module.exports = function(kbox) {

  /*
   * Run the admin commands
   */
  var run = function(adminCommands, state, callback) {

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
      state.fail(state, data);
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
