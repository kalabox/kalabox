'use strict';

/**
 * This file/module contains helpful unit test tasks.
 */

module.exports = function(common) {

  return {
    mochacli: {
      options: {
        bail: true,
        reporter: 'nyan',
        recursive: true,
        env: {
          WINSTON_SHUTUP: true
        }
      },
      unit: common.files.mochaTests
    }
  };

};
