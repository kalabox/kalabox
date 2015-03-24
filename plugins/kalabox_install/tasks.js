'use strict';

module.exports = function(kbox) {

  // Installs the dependencies for kalabox to run
  kbox.core.tasks.registerTask('provision', function(done) {
    kbox.install.provision(done);
  });

  // Legacy installer, remove after new provision matures.
  var installer = require('./installer-' + process.platform + '.js');
  kbox.core.tasks.registerTask('provision-legacy', function(done) {
    installer.run(done);
  });

};
