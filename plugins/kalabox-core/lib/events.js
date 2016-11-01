'use strict';

module.exports = function(kbox) {

  // Node modules
  var format = require('util').format;

  // Npm modules
  var rest = require('restler');
  var _ = require('lodash');

  // Kalabox modules
  var Promise = kbox.Promise;

  // Logging
  var log = kbox.core.log.make('CORE PLUGIN');

  /*
   * Helper function to check to see if a site is ready or not
   */
  var verifyIsUp = function(app) {

    // Communication is the key to every succesful relationship
    app.status('Waiting for site to be ready.');

    // Ping the site until its ready to go
    return Promise.retry(function() {

      // Grab the URL we want to check
      var site = app.url;

      // Log the attempt
      log.debug(format('Checking to see if %s is ready.', site));

      // Send REST request.
      return new Promise(function(fulfill, reject) {

        // Make the actual request, lets make sure self-signed certs are OK
        rest.get(site, {rejectUnauthorized: false})

        // Log result and fulfil promise
        .on('success', function(data) {
          log.debug(format('%s is now ready.', site));
          fulfill(data);
        })

        // Throw an error on fail/error
        .on('fail', function(data, response) {

          // Get the codes and define codes that should indicate the site
          // is not ready yet
          var code = response.statusCode;
          var waitCodes = [400, 502];

          if (_.includes(waitCodes, code)) {
            log.debug(format('%s not yet ready with code %s.', site, code));
            reject(new Error(response));
          }
          else {
            log.debug(format('%s is now ready.', site));
            fulfill(data);
          }

        }).on('error', reject);

      });

    }, {max: 40});
  };

  /*
   * App events
   */
  kbox.core.events.on('post-app-load', function(app) {

    /**
     * Ping the site until its ready to go
     * This avoids a preemptive 50* error showing up at the sites url
     * Attempt the request and retry a few times if this is a normal
     * start request, ie not during a create event
     */
    app.events.on('post-start', 8, function() {
      if (!app.creating) {
        return verifyIsUp(app);
      }
    });

    /**
     * Ping the site until its ready to go
     * This avoids a preemptive 50* error showing up at the sites url
     */
    app.events.on('post-create', 9, function() {
      return verifyIsUp(app);
    });

  });

};
