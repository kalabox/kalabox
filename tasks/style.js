'use strict';

/**
 * This file/module contains helpful style/linting tasks.
 */

module.exports = function(common) {

  /*
   * Linting and code standards
   */
  return {
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      cli: common.files.cliJs,
      gui: common.files.guiJs,
      aux: common.files.auxJs
    },
    jscs: {
      options: {
        config: '.jscsrc'
      },
      cli: common.files.cliJs,
      gui: common.files.guiJs,
      aux: common.files.auxJs
    },
    // Angular html validate
    htmlangular: {
      options: {
        tmplext: 'html.tmpl',
        reportpath: null,
        reportCheckstylePath: null,
        customattrs: [
          'job-*',
          'site-*',
          'provider-*',
          'placeholder',
          'start-*',
          'uib-*',
          'auto-close',
          'show-errors',
          'notification-center',
          'app-click',
          'pantheon-app-click',
          'site',
          'select-on-click',
          'switch'
        ],
        relaxerror: [
          'This document appears to be written in English. ' +
          'Consider adding “lang="en"” (or variant) to the “html” element ' +
          'start tag.',
          'Empty heading.',
          'Element “img” is missing required attribute “src”',
          'Element “browser” not allowed as child of element “li” in this ' +
          'context',
          'Element “switch” not allowed as child of element “div” in this ' +
          'context',
          'The “for” attribute of the “label” element must refer to a ' +
          'non-hidden form control'
        ]
      },
      files: {
        src: common.files.htmlTpl
      },
    },
    mdlint: ['docs/**/*.md']
  };

};
