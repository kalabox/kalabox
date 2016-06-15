'use strict';

var kbox = require('../lib/kbox.js');
var internet = kbox.util.internet;

describe('internet.js', function() {

  describe('#check()', function() {

    it('should return true when a site is reachable.', function(done) {
      this.timeout(10 * 1000);
      return internet.check()
      .then(done);
    });

  });

});
