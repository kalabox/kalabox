'use strict';

var _ = require('lodash');
var async = require('async');

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

  if (fn.length !== 1) {
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
var runActions = function(actions, done) {

  // Loop through each action.
  async.series(actions, done);

};

/*
 * Run each check.
 */
var runChecks = function(checks, done) {

  // Loop through each check.
  async.series(checks, done);

};

/*
 * Run through to completion a full state change.
 */
var increment = function(done) {

  // Get a random number of random actions.
  //var actions = getActions(5);
  var actions = getActions(1);

  // Get a random number of random checks.
  var checks = getChecks(9);

  // Run each action.
  runActions(actions, function(err) {

    // Report errors.
    if (err) {
      return done(err);
    }

    // Run each check.
    runChecks(checks, function(err) {

      // Return.
      done(err);

    });
    
  });

};

/*
 * Increment until whileFunc returns false.
 */
var run = exports.run = function(whileFunc, done) {

  // While whileFunc returns true, run increment.
  async.whilst(whileFunc, increment, done);
  
};
