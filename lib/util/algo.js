'use strict';

var _ = require('lodash');
/*
 * @todo: @bcauldwell the below line will now fail. we can probably convert
 * the async stuff to promises or include async as a node dev dep presuming that
 * this is used only for dev reasons
 */
var async = require('async');
var assert = require('assert');

// @todo - @bcauldwell to we need this file at all anymore?

/*
 * Take an array of errors and combine them into a new error.
 */
var joinErrors = function(errs) {

  var msgs = _.map(errs, function(err) { return err.message; });

  var msg = _.reduce(msgs, function(acc, msg) {
    return acc + msg + '\n\n';
  }, 'MULTIPLE ERRORS:\n\n');

  return new Error(msg);

};

/*
 * Reduce an array of errs to a single error.
 */
var reduceErrors = function(errs) {

  errs = _.filter(errs, _.identity);

  if (errs.length === 0) {

    return null;

  } else if (errs.length === 1) {

    return errs[0];

  } else {

    return joinErrors(errs);

  }

};

/*
 * Apply iterator to each item in arr in series, if iterator reports an error
 * add it to a list of errors and continue to the next item in arr.
 */
var eachSeriesContinue = function(arr, iterator, cb) {

  var fn = function(elt, next) {
    iterator(elt, function(err) {
      next(null, err);
    });
  };

  var done = function(ignore, errs) {
    assert(!ignore);
    cb(reduceErrors(errs));
  };

  async.mapSeries(arr, fn, done);

};

module.exports = {
  eachSeriesContinue: eachSeriesContinue
};
