'use strict';

/**
 * This contains a promisified confirmation question
 */

module.exports = function(kbox) {

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
   * Run the admin commands
   */
  var run = function(adminCommands, state, callback) {

    // Validate the admin commands
    if (validate(adminCommands) !== true) {
      callback(new Error(validate(adminCommands)));
    }

    // Process admin commands.
    var child = kbox.install.cmd.runCmdsAsync(adminCommands, state);

    // Events
    // Output data
    child.stdout.on('data', function(data) {
      state.log.info(data);
    });
    // Callback when done
    child.stdout.on('end', function() {
      callback();
    });
    // Fail the installer if we get an error
    child.stderr.on('data', function(err) {
      // Fail the install on error on non-linux
      // @todo: VB install on linux often reports non errors on stderr
      // so we need another way to report admin install failure on linux
      if (process.platform !== 'linux') {
        state.fail(state, err);
      }
    });

  };

  return {
    run: run
  };

};
