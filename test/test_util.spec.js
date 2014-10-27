'use strict';

var assert = require('chai').assert,
  expect = require('chai').expect,
  test_util = require('../lib/test_util.js'),
  fs = require('fs'),
  path = require('path');

describe('test_util.js', function () {

  describe('#mock_fs', function () {
  
    var iterFilesAndVerify = function (files, shouldExist) {
      files.forEach(function (file) {
        expect(fs.existsSync(file)).to.equal(shouldExist, '[' + file + ']');
      }); 
    },
    HOME_DIR = process.env['HOME'],
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
      var mock_fs = test_util.mock_fs.create({});
      expect(mock_fs).to.have.property('restore');
      iterFilesAndVerify(files, false);

      // make sure teardown works
      mock_fs.restore();
    });
     
    it('Should return a mock_fs that is setup correctly.', function () {
      // create and verify
      var mock_fs = test_util.mock_fs.create();
      expect(mock_fs).to.have.property('restore');
      iterFilesAndVerify(files, true);

      // make sure teardown works
      mock_fs.restore();
    });

  });

});
