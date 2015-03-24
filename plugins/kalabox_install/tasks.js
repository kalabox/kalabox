'use strict';

module.exports = function(kbox) {

  // Installs the dependencies for kalabox to run
  kbox.core.tasks.registerTask('provision', function(done) {

    // Logging function.
    var log = function(msg) {
      if (msg) {
        console.log('#### ' + msg + ' ####');
      } else {
        console.log('');
      }
    };

    // Keep track of which step we are on.
    var stepCount = 1;

    // Total number of steps.
    var totalSteps = kbox.install.stepCount();

    // Get the current time in milliseconds.
    var getTime = function() {
      return Date.now();
    };

    // Time the install started.
    var startTime = getTime();

    // Time the current step started.
    var stepStartTime = startTime;

    // Runs right before step.
    kbox.install.events.on('pre-step', function(step) {
      var stepNumberInfo = [stepCount, totalSteps].join(':');
      var stepInfo = 'Starting ' + step.name;

      log('[' + stepNumberInfo + '] ' + stepInfo);
      log('description => ' + step.description);
      log('dependencies => ' + step.deps.join(', '));

      stepCount += 1;
    });

    // Runs right after step.
    kbox.install.events.on('post-step', function(step) {
      var now = getTime();
      var duration = now - stepStartTime;
      stepStartTime = now;

      log('Finished ' + step.name + ' (' + duration + ')');
      log();
    });

    // Error.
    kbox.install.events.on('error', function(err) {
      done(err);
    });

    // Install is done.
    kbox.install.events.on('end', function(state) {
      done();
    });

    // Run the installer.
    kbox.install.run();

  });

  // Legacy installer, remove after new provision matures.
  var installer = require('./installer-' + process.platform + '.js');
  kbox.core.tasks.registerTask('provision-legacy', function(done) {
    installer.run(done);
  });

};
