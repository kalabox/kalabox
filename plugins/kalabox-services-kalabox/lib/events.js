'use strict';

module.exports = function(kbox) {

  // Npm modules
  var _ = require('lodash');
  var redis = require('redis');
  var VError = require('verror');
  var pp = kbox.util.pp;

  // Kalabox modules
  var Promise = kbox.Promise;

  // Logging
  var log = kbox.core.log.make('SERVICES');

  /*
   * App events
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Grab our services config
    var services = app.config.pluginconfig.services || {};

    // "Constants"
    var REDIS_PORT = 8160;

    /*
     * Return the default app compose object
     */
    var getAppServices = function(app) {
      return {
        compose: _.uniq(app.composeCore),
        project: app.name,
        opts: {
          app: app
        }
      };
    };

    /**
     * Creates a proxy record via redis for components with proxy definitions.
     */
    app.events.on('post-start', 1, function() {

      // Go through our services that need to be exposed
      return Promise.each(_.keys(services), function(service) {

        // Get the redis IP
        var REDIS_IP = kbox.core.deps.get('engineConfig').host;

        // Connect to the hipache redis server.
        var redisClient = redis.createClient(REDIS_PORT, REDIS_IP);

        // Build an inspect definition
        var inspectService = getAppServices(app);
        inspectService.opts.services = [service];

        // Query engine for component container's information.
        kbox.engine.inspect(inspectService)
        .then(function(data) {

          // Get port information from container query.
          var portInfo = _.get(data, 'NetworkSettings.Ports');

          // Options for looping through each proxy.
          var mapOpts = {concurrency: 1};

          // Loop through each proxy.
          return Promise.map(services[service], function(proxy) {

            // Should this proxy mapping be just the domain, or should
            // it have a subdomain.
            var hostname = proxy.default ? app.hostname : [
              proxy.hostname,
              app.name,
              app.domain
            ].join('.');
            var protocol = proxy.secure ? 'https' : 'http';
            var url = [protocol, hostname].join('://');

            // Build redis key for this proxy.
            var redisKey = ['frontend', url].join(':');

            // Get port for this proxy from port information.
            var port = _.get(
              portInfo,
              '[' + proxy.port + '][0].HostPort',
              null
            );

            // If we have ports then do the mapping
            if (port) {

              // Build our destinations.
              var destination = [protocol, '://', REDIS_IP, ':', port].join('');
              var containerName = _.trimLeft(data.Name, '/');

              // Log each DNS record being added.
              _.each([containerName, destination], function(address) {
                log.debug(kbox.util.format(
                  'Setting DNS record. %s => %s',
                  redisKey,
                  address
                ));
              });

              // Execute action against redis server.
              return Promise.fromNode(function(cb) {
                redisClient.multi()
                .del(redisKey)
                .rpush(redisKey, containerName)
                .rpush(redisKey, destination)
                .exec(cb);
              });

            }

          }, mapOpts);

        })
        // Wrap errors.
        .catch(function(err) {
          throw new VError(
            err,
            'Error configuring DNS for component "%s".',
            pp(service)
          );
        })
        // Make sure we disconnect from redis server.
        .finally(function() {
          redisClient.quit();
        });

      });
    });

    /**
     * Removes proxy records via redis.
     */
    app.events.on('post-stop', function() {

      // Go through our services that need to be exposed
      return Promise.each(_.keys(services), function(service) {

        // Get the redis IP
        var REDIS_IP = kbox.core.deps.get('engineConfig').host;

        var redisClient = null;

        // Connect to the hipache redis server.
        return Promise.try(function() {
          return Promise.fromNode(function(cb) {
            redisClient = redis.createClient(REDIS_PORT, REDIS_IP);
            redisClient.on('ready', cb);
            redisClient.on('error', function(err) {
              redisClient.end();
              redisClient = undefined;
              cb(err);
            });
          });
        })
        // Loop through each proxy.
        .then(function() {
          return Promise.map(services[service], function(proxy) {

            // Should this proxy mapping be just the domain, or should
            // it have a subdomain.
            var hostname = proxy.default ? app.hostname : [
              proxy.hostname,
              app.name,
              app.domain
            ].join('.');

            // Build redis key for this proxy.
            var redisKey = ['frontend', hostname].join(':');

            // Log deletiong of DNS records.
            log.debug(kbox.util.format('Removing DNS records. %s', redisKey));

            // Delete key on redis server.
            return Promise.fromNode(function(cb) {
              redisClient.del(redisKey, cb);
            });
          });
        })
        // Wrap errors.
        .catch(function(err) {
          /*
           * Ignore ECONNREFUSED errors because sometimes we might want to
           * uninstall an app without having the startup services running.
           * When that is the case it's best to just ignore errors trying
           * to connect to the redis server.
           */
          if (!_.contains(err.message, 'ECONNREFUSED')) {
            throw new VError(
              err,
              'Error resetting DNS for component "%s".',
              pp(service)
            );
          }
        })
        // Make sure we end connection to redis server.
        .finally(function() {
          if (redisClient) {
            redisClient.end();
          }
        });

      });
    });
  });
};
