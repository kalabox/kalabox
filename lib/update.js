'use strict';

var install = require('./install.js');
var framework = install.framework();

exports.run = function(callback) {
  framework.getInstall(process.platform)(callback);
};

exports.getSteps = function() {
  return framework.getSteps(process.platform);
};

exports.events = framework.events;

exports.stepCount = framework.count;

/**
 * Register an update step with the kalabox update framework.
 * @static
 * @method
 * @arg {function} handler - Function used to build a new update step.
 * @arg {object} handler.step - Unitialized step object.
 * @arg {function} handler.done [optional] - Callback function to return async
 *   control back to kalabox.
 * @example
 * kbox.update.registerStep(function(step) {
 *   step.name = 'update-my-custom-plugin';
 *   step.description = 'Update my custom plugin that kicks butt!';
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
 *     state.log('starting to update my custom plugin.');
 *     myCustomPlug.update(function(err) {
 *       if (err) {
 *         return done(err);
 *       }
 *       state.log('done updating my custom plugin.');
 *       done();
 *     });
 *   };
 *
 *   // Or you can define different functions for different operation systems.
 *
 *   // Run this update function only for darwin (Mac OS X).
 *   step.all.darwin = function(state, done) {
 *     // Do darwin specific stuffs.
 *     done();
 *   };
 *
 *   // Run this update function only for fedora.
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
exports.registerStep = framework.registerStep;
