
'use strict';

/**
 * Kalabox cli utility module.
 */

// Npm modules
var _ = require('lodash');

/**
 * Filters out questions that already have options
 * @example
 * return kbox.util.disk.getDiskStatus()
 *
 * .then(function(status) {
 *   // something to with status
 * })
 */
exports.filterQuestions = function(questions, options) {
  return _.filter(questions, function(question) {
    // Get the option name
    var option = options[question.name];

    // If the question has filter we need to apply that to the option
    // so it is parsed correctly
    if (question.filter) {
      options[question.name] = question.filter(options[question.name]);
    }

    // If there is no option then this is pretty easy
    if (option === false || option === undefined) {
      return true;
    }

    else {
      // Return questions that are not passed in options
      return !_.includes(Object.keys(options), question.name);
    }
  });
};
