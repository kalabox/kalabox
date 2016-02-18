/**
 * Module to handle yaml data and files.
 * @name yaml
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

/**
 * Safeloads yaml data to object
 * @arg {string} file - The path of the yaml file.
 */
exports.dataToJson = function(data) {
  return yaml.safeLoad(data);
};

/**
 * Converts object to yaml
 * @memberof yaml
 * @arg {string} file - The path of the yaml file.
 */
var toYaml = exports.toYaml = function(obj) {
  return yaml.safeDump(obj);
};

/**
 * Converts object to yamlfile
 * @arg {string} file - The path of the yaml file.
 */
exports.toYamlFile = function(obj, file) {
  fs.writeFileSync(file, toYaml(obj));
};
