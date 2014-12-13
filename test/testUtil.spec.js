'use strict';

var assert = require('chai').assert;
var expect = require('chai').expect;
var testUtil = require('../lib/testUtil.js');
var fs = require('fs');
var path = require('path');

describe('test util', function() {

  describe('#mockFs', function() {

    var iterFilesAndVerify = function(files, shouldExist) {
      files.forEach(function(file) {
        expect(fs.existsSync(file)).to.equal(shouldExist, '[' + file + ']');
      });
    };
    var HOME_DIR = process.env.HOME;
    var APPS_DIR = path.join(HOME_DIR, '.kalabox/apps/');
    var join = function(x) { return path.join(APPS_DIR, x); };
    var files = [
      APPS_DIR,
      join('myapp1'),
      join('myapp2'),
      join('myapp3'),
      join('myapp4'),
      join('myapp5')
    ];

    it('Should return an empty fs if passed create options.', function() {
      // create and verify
      var mockFs = testUtil.mockFs.create({});
      expect(mockFs).to.have.property('restore');
      iterFilesAndVerify(files, false);

      // make sure teardown works
      mockFs.restore();
    });

    it('Should return a mockFs that is setup correctly.', function() {
      // create and verify
      var mockFs = testUtil.mockFs.create();
      expect(mockFs).to.have.property('restore');
      iterFilesAndVerify(files, true);

      // make sure teardown works
      mockFs.restore();
    });

  });

});
