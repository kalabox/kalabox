'use strict';

//var exec = require('child_process').exec;
//var fs = require('fs');
//var path = require('path');
//var _ = require('lodash');
//var async = require('async');
//var rimraf = require('rimraf');

module.exports = function(argv, app, appConfig, kbox) {

  var tasks = kbox.core.tasks;

  var prettyPrint = function(obj) {
    console.log(JSON.stringify(obj, null, '  '));
  };

  var printConfig = function(which) {
    tasks.registerTask(['sync', which, 'config'], function(done) {
      var instance;
      if (which === 'local') {
        instance = kbox.share.getLocalSync;
      } else if (which === 'remote') {
        instance = kbox.share.getRemoteSync;
      } else {
        var msg = 'The option [' + which + '] is invalid, please choose ' +
          'either local or remote.';
        done(new Error(msg));
      }
      instance()
      .then(function(sync) {
        sync.getConfig()
        .then(function(config) {
          prettyPrint(config);
          done(null);
        })
        .catch(function(err) {
          done(err);
        });
      });
    });
  };

  printConfig('local');
  printConfig('remote');

};
