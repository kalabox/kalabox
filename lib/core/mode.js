'use strict';

var _ = require('lodash');

var startMode = null;

var mode = startMode;

var validModes = [
  'cli',
  'gui'
];

var isValidMode = function(modeToSet) {
  return _.contains(validModes, modeToSet);
};

exports.set = function(modeToSet) {
  if (mode !== null) {
    throw new Error('Mode has already been set: ' + mode);
  } else if (!isValidMode(modeToSet)) {
    throw new Error('Invalid mode: ' + modeToSet);
  } else {
    mode = modeToSet;
    return mode;
  }
};

exports.get = function() {
  return mode;
};

exports.clear = function() {
  mode = startMode;
};
