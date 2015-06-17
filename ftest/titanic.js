'use strict';

var _ = require('lodash');
var Promise = require('bluebird');

// Singleton array of actions.
var actions = [];

// Singleton array of checks.
var checks = [];

/*
 * Validate typeof and length of function.
 */
var validateFunction = function(fn) {

  if (typeof fn !== 'function') {
    throw new TypeError('Invalid function: ' + fn);
  }

  if (fn.length !== 0) {
    throw new TypeError('Invalid function signature: ' + fn.toString());
  }

};

/*
 * Add to list of actions.
 */
var addAction = exports.addAction = function(action) {
  validateFunction(action);
  actions.push(action);
};

/*
 * Add to list of checks.
 */
var addCheck = exports.addCheck = function(check) {
  validateFunction(check);
  checks.push(check);
};

/*
 * Return a random number between 0 and max.
 */
var getRandomNumber = function(min, max) {
  
  return _.random(min, max);

};

/*
 * Return a random element of array.
 */
var getRandomFromArray = function(arr) {
  
  return arr[getRandomNumber(0, arr.length - 1)];

};

/*
 * Return a random action.
 */
var getRandomAction = function() {

  return getRandomFromArray(actions);

};

/*
 * Return a random check.
 */
var getRandomCheck = function() {

  return getRandomFromArray(checks);

};

/*
 * Return an array of 1 to max elements mapped to result of map function.
 */
var getRandomArray = function(max, map) {

  return _.times(getRandomNumber(1, max), map);

};

/*
 * Gets up to max number of random actions.
 */
var getActions = function(max) {

  return getRandomArray(max, getRandomAction);

};

/*
 * Gets up to max number of random checks.
 */
var getChecks = function(max) {

  return getRandomArray(max, getRandomCheck);

};

/*
 * Run each action and restore state of kbox after each.
 */
var runActions = function(actions) {

  // Loop through each action.
  return Promise.each(actions, function(action) {
    return action();
  });

};

/*
 * Run each check.
 */
var runChecks = function(checks) {

  // Loop through each check.
  return Promise.each(checks, function(check) {
    return check();  
  });

};

/*
 * Run through to completion a full state change.
 */
var increment = function() {

  // Get a random number of random actions.
  var actions = getActions(3);

  // Get a random number of random checks.
  var checks = getChecks(9);

  // Run each action.
  return runActions(actions)
  .then(function() {
    return runChecks(checks);
  })

};

/*
 * Increment until whileFunc returns false.
 */
var run = exports.run = function(whileFunc) {

  // While whileFunc returns true, run increment.
  var rec = function() {
    if (whileFunc()) {
      return increment()
      .then(function() {
        return rec();
      });
    }
  };

  return rec();
  
};
