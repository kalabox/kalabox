'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  require('./tasks/cleanup.js')(kbox);
  require('./tasks/env.js')(kbox);
  require('./tasks/inspect.js')(kbox);
  require('./tasks/query.js')(kbox);
  require('./tasks/logs.js')(kbox);
  require('./tasks/terminal.js')(kbox);

};
