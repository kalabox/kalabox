'use strict';

var assert = require('chai').assert,
  expect = require('chai').expect,
  testUtil = require('../lib/test_util.js'),
  fs = require('fs'),
  path = require('path');

describe('test util', function () {

  describe('#mockFs', function () {

    var iterFilesAndVerify = function (files, shouldExist) {
      files.forEach(function (file) {
        expect(fs.existsSync(file)).to.equal(shouldExist, '[' + file + ']');
      });
    },
    HOME_DIR = process.env.HOME,
    APPS_DIR = path.join(HOME_DIR, '.kalabox/apps/'),
    join = function (x) { return path.join(APPS_DIR, x); },
    files = [
      APPS_DIR,
      join('myapp1'),
      join('myapp2'),
      join('myapp3'),
      join('myapp4'),
      join('myapp5')
    ];

    it('Should return an empty fs if passed create options.', function () {
      // create and verify
      var mockFs = testUtil.mockFs.create({});
      expect(mockFs).to.have.property('restore');
      iterFilesAndVerify(files, false);

      // make sure teardown works
      mockFs.restore();
    });

    it('Should return a mockFs that is setup correctly.', function () {
      // create and verify
      var mockFs = testUtil.mockFs.create();
      expect(mockFs).to.have.property('restore');
      iterFilesAndVerify(files, true);

      // make sure teardown works
      mockFs.restore();
    });

  });

});
