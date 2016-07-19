'use strict';

/**
 * This file/module contains helpful frontend watches.
 */

module.exports = function(common) {

  return {

    options: {
      livereload: true
    },
    appJS: {
      files: ['src/modules/**/*'],
      tasks: ['jshint', 'copy:guiBuild']
    },
    assets: {
      files: ['src/assets/**/*'],
      tasks: ['copy:guiBuild']
    },
    html: {
      files: ['src/index.html'],
      tasks: ['index:build']
    },
    tpls: {
      files: common.files.htmlTpl,
      tasks: ['html2js:app']
    },
    sass: {
      files: ['src/**/*.scss'],
      tasks: ['sass:compile']
    }

  };

};
