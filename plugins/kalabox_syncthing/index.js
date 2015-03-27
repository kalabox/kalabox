'use strict';

module.exports = function(kbox) {

  require('./install.js')(kbox);
  require('./events.js')(kbox);

};
