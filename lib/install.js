'use strict';

/**
 * Module for accessing the kalabox install framework.
 * @module kbox.install
 */

var cmd = require('./install/cmd.js');
exports.cmd = cmd;

var framework = exports.framework = require('./install/framework.js');

var installFramework = framework();

var linuxOsInfo = require('./install/linuxOsInfo.js');
exports.linuxOsInfo = linuxOsInfo;

exports.run = function(callback) {
  var installFunction = installFramework.getInstall(process.platform);
  installFunction(callback);
};

exports.getSteps = function() {
  return installFramework.getSteps(process.platform);
};

exports.events = installFramework.events;

exports.stepCount = installFramework.count;

/**
 * Register an install step with the kalabox install framework.
 * @static
 * @method
 * @arg {function} handler - Function used to build a new install step.
 * @arg {object} handler.step - Unitialized step object.
 * @arg {function} handler.done [optional] - Callback function to return async
 *   control back to kalabox.
 * @example
 * kbox.install.registerStep(function(step) {
 *   step.name = 'install-my-custom-plugin';
 *   step.description = 'Install my custom plugin that kicks butt!';
 *
 *   // List of the names of other steps this step requires to be run first.
 *   step.deps = ['internet'];
 *
 *   // List of the names of other steps that should be run after
 *   //   this one.
 *   step.subscribes = ['use-my-custom-plugin'];
 *
 *   // You can define one function for all operating systems.
 *   step.all = function(state, done) {
 *     state.log('starting to install my custom plugin.');
 *     myCustomPlug.install(function(err) {
 *       if (err) {
 *         return done(err);
 *       }
 *       state.log('done installing my custom plugin.');
 *       done();
 *     });
 *   };
 *
 *   // Or you can define different functions for different operation systems.
 *
 *   // Run this install function only for darwin (Mac OS X).
 *   step.all.darwin = function(state, done) {
 *     // Do darwin specific stuffs.
 *     done();
 *   };
 *
 *   // Run this install function only for fedora.
 *   step.all.linux.fedora = function(state, done) {
 *     // Do fedora specific stuffs.
 *     done();
 *   };
 *
 *   // Here are all possible choices.
 *   step.all: {
 *     darwin: function
 *     linux: {
 *       debain: function,
 *       fedora: function,
 *       other: function
 *     },
 *     win32: function
 *   };
 *
 * });
 */
exports.registerStep = installFramework.registerStep;
