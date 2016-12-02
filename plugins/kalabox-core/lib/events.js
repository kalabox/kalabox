'use strict';

module.exports = function(kbox) {

  // Node modules
  var format = require('util').format;
  var path = require('path');

  // Npm modules
  var rest = require('restler');
  var _ = require('lodash');
  var fs = require('fs-extra');

  // Kalabox modules
  var Promise = kbox.Promise;

  // Logging
  var log = kbox.core.log.make('CORE PLUGIN');

  /*
   * Return an object of default envs and labels
   */
  var getComposeDefaults = function(data) {

    // Get options
    var composeFiles = data.compose || {};
    var project = data.project || 'kalabox';

    // Create dir to store this stuff
    var tmpDir = path.join(kbox.util.disk.getTempDir(), project);
    fs.mkdirpSync(tmpDir);

    // Colllect our compose files
    var currentCompose = {};

    // Get our composed things
    _.forEach(composeFiles, function(file)  {
      _.extend(currentCompose, kbox.util.yaml.toJson(file));
    });

    // Build our default object
    var defaults = {};

    // Iterate through keys and add defaults
    _.forEach(_.keys(currentCompose), function(key) {
      defaults[key] = {
        environment: {
          'KALABOX': 'ON',
          'KALABOX_HOSTOS': process.platform
        },
        labels: {
          'io.kalabox.container': 'TRUE'
        }
      };
    });

    // Add in our compose file with the defaults
    if (!_.isEmpty(defaults)) {
      var fileName = [project, _.uniqueId()].join('-');
      var defaultComposeFile = path.join(tmpDir, fileName + '.yml');
      kbox.util.yaml.toYamlFile(defaults, defaultComposeFile);
      composeFiles.push(defaultComposeFile);
    }

    // Return our defaults
    return composeFiles;

  };

  /*
   * Helper function to check to see if a site is ready or not
   */
  var verifyIsUp = function(app) {

    // Communication is the key to every succesful relationship
    app.status('Waiting for site to be ready.');

    // Grab the URL we want to check
    var site = app.url;

    // Ping the site until its ready to go
    return Promise.retry(function() {

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

    }, {max: 15})

    // We've been unable to get the correct status code so lets shoot out a
    // non-fatal warning to the user
    .catch(function() {
      log.warn(
        format('Unexpected status code returned. This MAY be a problem. ' +
        'Check your site at %s to verify. Restarting your app may help.', site)
      );
    });
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

  /*
   * Engine events
   */

  // Add defaults to start events
  kbox.core.events.on('pre-engine-start', function(data) {
    data.compose = getComposeDefaults(data);
  });

  // Add defaults to run events
  kbox.core.events.on('pre-engine-run', function(data) {
    data.compose = getComposeDefaults(data);
  });

  /*
   * Core events
   * Shut down all app containers
   */
  kbox.core.events.on('pre-engine-down', 2, function() {

    // Get all our apps
    return kbox.app.list()

    // SHUT IT ALL DOWN
    .each(function(app) {
      return kbox.app.stop(app);
    });

  });

};
