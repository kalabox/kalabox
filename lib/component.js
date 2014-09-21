var fs = require('fs');
var path = require('path');

var _ = require('lodash');

var baseDir = path.resolve(__dirname, '../');
var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var dataPath = path.resolve(homePath, '.kalabox');
var appPath = path.resolve(dataPath, 'apps');

var Component = function(app, key, component) {
  // Copy config
  for (var x in component) {
    this[x] = component[x];
  }

  component.key = key;
  //component.app = app;

  // component hostname format: mysite-web.kbox
  // Used when multiple containers may require proxy access
  component.hostname = component.key + '.' + app.appdomain;
  component.url = 'http://' + component.hostname;
  component.dataCname = app.hasData && key !== 'data' ? app.dataCname : null;
  component.cname = app.prefix + key;
  component.cidfile = path.resolve(app.cidPath, key);

  if (fs.existsSync(component.cidfile)) {
    component.cid = fs.readFileSync(component.cidfile, 'utf8');
  }

  // set component build source to which ever valid path is found first:
  // 1) relative to .kalabox.json file, 2) relative to ~/.kalabox, 3) relative to the the Kalabox source
  if (component.image.build) {
    var src = loadPath(app, component.image.src);
    if (src === false) {
      component.image.build = false;
    }
    component.image.src = src;
  }
};

/**
 * Fetches a valid path based on a given relative path.
 * - First looks relative to the .kalabox.json file
 * - Second looks relative to the ~/.kalabox directory
 * - Third looks relative to the Kalabox source
 */
var loadPath = function(app, relativePath) {
  var src = path.resolve(app.path, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(dataPath, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  src = path.resolve(baseDir, relativePath);
  if (fs.existsSync(src)) {
    return src;
  }
  return false;
};

module.exports = Component;