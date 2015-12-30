/**
 * Module to handle yaml data and files.
 * @module kbox.util.yaml
 */

'use strict';

var yaml = require('js-yaml');
var fs = require('fs-extra');

/**
 * Reads a file and return json object
 * @arg {string} file - The path of the yaml file.
 */
exports.toJson = function(file) {
  var data = fs.readFileSync(file);
  return yaml.safeLoad(data);
};