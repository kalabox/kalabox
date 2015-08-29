'use strict';

module.exports = function(kbox) {
  // Load CLI tasks for this plugin.
  var profile = kbox.core.deps.get('globalConfig').profile;
  var envDev = process.env['KALABOX_DEV'];
  if (profile === 'dev' || envDev === 'true') {
    require('./tasks.js')(kbox);
  }
};
