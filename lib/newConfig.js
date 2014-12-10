'use strict';

var expect = require('chai').expect;

var DEFAULT_CONFIG = {
  appsDirs: ['foo'],
  bar: 3,
  chopper: 'NOW'
};

var KEYS_TO_CONCAT = {'appsDirs':null};

/*var defaults = {
  appsDirs: ['foo'],
  bar: 3,
  chopper: 'NOW'
};*/

var globalConfigFile = {
  bar: 7
};

var appConfigFile = {
  appsDirs: ['home'],
  chopper: 'GET TO'
};

function mixIn(a, b) {
  for (var key in b) {
    var shouldConcat = KEYS_TO_CONCAT[key] !== undefined;
    if (shouldConcat) {
      // Concat.
      if (a[key] === undefined) {
        a[key] = b[key];
      } else {
        a[key] = a[key].concat(b[key]);
      }
    } else {
      // Override.
      a[key] = b[key];
    }
  }
  return a;
}

var getGlobalConfig = function() {
  return mixIn(DEFAULT_CONFIG, globalConfigFile);
};

var getAppConfig = function() {
  return mixIn(getGlobalConfig(), appConfigFile);
};

var countProperties = function(obj) {
  var count = 0;
  for (var _ in obj) {
    count += 1;
  }
  return count;
};

var config = getAppConfig();
expect(countProperties(config)).to.equal(3);
expect(config.appsDirs).to.deep.equal(['foo', 'home']);
expect(config.bar).to.equal(7);
expect(config.chopper).to.equal('GET TO');

console.log(JSON.stringify(config));
