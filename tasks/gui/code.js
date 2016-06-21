'use strict';

/**
 * This file/module contains all configuration for code standards and styling
 */

/*
 * Both linting and jscs should use the same files
 */
var jsCodes = function(options) {
  return {
    options: options,
    src: [
      '<%= appFiles.js %>',
    ],
    test: [
      '<%= appFiles.jsunit %>'
    ],
    grunt: [
      'grunt/*.js'
    ],
    gruntfile: [
      'Gruntfile.js'
    ]
  };
};

// Return the codes
module.exports = {

  /**
   * `jshint` defines the rules of our linter as well as which files we
   * should check. This file, all javascript sources, and all our unit tests
   * are linted based on the policies listed in `options`. But we can also
   * specify exclusionary patterns by prefixing them with an exclamation
   * point (!); this is useful when code comes from a third party but is
   * nonetheless inside `src/`.
   */
  jshint: jsCodes({jshintrc: '.jshintrc', reporter: require('jshint-stylish')}),

  // Some code standards
  jscs: jsCodes({config: '.jscsrc'}),

  // Angular html validate
  htmlangular: {
    options: {
      tmplext: 'html.tmpl',
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
      src: ['<%= appFiles.atpl %>']
    }
  }
};
