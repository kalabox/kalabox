'use strict';

/**
 * This file/module contains helpful util config.
 */

module.exports = {

  /**
   * Increments the version number, etc.
   */
  bump: {
    options: {
      files: ['package.json', 'bower.json'],
      updateConfigs: [],
      commit: true,
      commitMessage: 'Release v%VERSION%',
      commitFiles: ['package.json', 'bower.json'],
      createTag: true,
      tagName: 'v%VERSION%',
      tagMessage: 'Version %VERSION%',
      push: true,
      pushTo: 'origin',
      gitDescribeOptions: '--tags --always --abbrev=1 --dirty=-d',
      globalReplace: false,
      prereleaseName: 'alpha',
      metadata: '',
      regExp: false
    }
  }

};
