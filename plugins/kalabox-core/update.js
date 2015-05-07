'use strict';

module.exports = function(kbox) {

  var chalk = require('chalk');
  var fs = require('fs');
  var path = require('path');
  var inquirer = require('inquirer');
  var util = require('./util.js')(kbox);
  var helpers = kbox.util.helpers;

  // Add common steps
  require('./steps/common.js')(kbox, 'update');

  kbox.update.registerStep(function(step) {
    step.name = 'core-deps';
    step.deps = ['core-downloads'];
    step.description = 'Updating your app deps...';
    step.all = function(state, done) {
      var appRoot = kbox.core.deps.lookup('appConfig').appRoot;
      kbox.util.npm.installPackages(appRoot, function(err) {
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

      var rebuild = function(done) {
        kbox.engine.up(3, function(err) {
          if (err) {
            done(err);
          } else {
            var app = kbox.core.deps.lookup('app');
            kbox.app.rebuild(app, done);
          }
        });
      };

      if (state.nonInteractive) {
        state.log.info(chalk.grey('Non-interactive mode.'));
        rebuild(done);
      }
      else {
        var questions = [
          {
            type: 'confirm',
            name: 'doit',
            message: 'Download new containers and rebuild app?'
          },
        ];
        inquirer.prompt(questions, function(answers) {
          if (answers.doit) {
            rebuild(done);
          }
          else {
            state.log.info(chalk.yellow('Not rebuilding may cause issues!'));
          }
        });
      }
    };
  });

};
