'use strict';

var chalk = require('chalk');
var fs = require('fs');
var path = require('path');
var prompt = require('prompt');

module.exports = function(kbox) {

  var util = require('./util.js')(kbox);
  var helpers = kbox.util.helpers;
  var app = kbox.core.deps.lookup('app');
  var appConfig = kbox.core.deps.lookup('appConfig');

  // Add common steps
  require('./steps/common.js')(kbox, 'update');

  kbox.update.registerStep(function(step) {
    step.name = 'core-deps';
    step.deps = ['core-downloads'];
    step.description = 'Updating your app deps...';
    step.all = function(state, done) {
      kbox.util.npm.installPackages(appConfig.appRoot, function(err) {
        if (err) {
          done(err);
        }
        else {
          state.log.debug('Updated app deps!');
          done();
        }
      });
    };
  });

  // Authorize the update process
  kbox.update.registerStep(function(step) {
    step.name = 'core-rebuild';
    step.deps = ['core-deps'];
    step.description = 'Rebuild?';
    step.all = function(state, done) {
      // this is how we pass in CLI options to stop interactive mode
      // Because freedom
      var date = new Date();
      var year = date.getFullYear();
      var month = date.getMonth() + 1;
      var day = date.getDate();
      var color = 'magenta';
      if ((year === 2015) && (month === 6) && (day >= 21 && day <= 28)) {
        color = 'rainbow';
      }
      prompt.override = {rebuild: state.nonInteractive};
      prompt.start();
      var msg = 'Download new containers and rebuild app? (y/n)';
      prompt.get({
        properties: {
          rebuild: {
            message: msg[color],
            validator: /y[es]*|n[o]?/,
            warning: 'Must respond yes or no',
            default: 'no'
          }
        }
      },
      function(err, result) {
        if (result.rebuild === true || result.rebuild.match(/y[es]*?/)) {
          kbox.engine.up(3, function(err) {
            if (err) {
              done(err);
            } else {
              kbox.app.rebuild(app, done);
            }
          });
        }
        else {
          state.log.info(chalk.yellow('Not rebuilding may cause issues!'));
          done();
        }
      });
    };
  });

};
