'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');
  var format = require('util').format;

  // Npm modules
  var _ = require('lodash');
  var redis = require('redis');

  // Kalabox modules
  var Promise = kbox.Promise;

  // Logging
  var log = kbox.core.log.make('SERVICES PLUGIN');

  /*
   * App events
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Grab our services config
    var proxyServices = app.config.pluginconfig.services || {};

    // "Constants"
    var REDIS_PORT = 8160;
    var REDIS_IP = kbox.core.deps.get('engineConfig').host;

    /*
     * Return the services for this app
     */
    var getAppService = function(service) {
      return {
        compose: _.uniq(app.composeCore),
        project: app.name,
        opts: {
          app: app,
          services: [service]
        }
      };
    };

    /*
     * Return the proxy and dns services
     */
    var getCoreServices = function() {
      return {
        compose: [path.resolve(__dirname, '..', 'kalabox-compose.yml')],
        project: 'kalabox',
        opts: {
          services: ['dns', 'proxy'],
          internal: true
        }
      };
    };

    /*
     * Return the redis client
     *
     * This allows us to retry the connection a few times just in case redis
     * is slow to start
     */
    var getRedisClient = function() {
      return Promise.retry(function() {
        log.debug(format('Connecting to redis on %s:%s', REDIS_IP, REDIS_PORT));
        return redis.createClient(REDIS_PORT, REDIS_IP);
      });
    };

    /**
     * Creates a proxy record via redis for components with proxy definitions.
     */
    app.events.on('post-start', 1, function() {

      // Make sure the core dns and proxy services are started up
      return kbox.engine.start(getCoreServices())

      // Get the services on this app we need to proxy
      .then(function() {
        return _.keys(proxyServices);
      })

      // Go through those services one by one and add a dns entry to redis if needed
      .each(function(service) {

        // Log the service getting confed
        log.debug(format('Configuration DNS for %s service.', service));

        // Inspect the service to be proxies
        return kbox.engine.inspect(getAppService(service))

        // Grab our port information from docker
        .then(function(data) {

          // Get port information from container query.
          var ports = _.get(data, 'NetworkSettings.Ports');

          // Loop through each proxy.
          return Promise.map(proxyServices[service], function(proxy) {

            // Start with the default hostname.
            var hostname = app.hostname;

            // If this is not the default DNS then prefix a subdomain
            if (!proxy.default) {
              hostname = [proxy.hostname, app.hostname].join('.');
            }

            // Grab the correct protocol for the entry
            var protocol = proxy.secure ? 'https' : 'http';

            // Combine into the total URL
            var url = [protocol, hostname].join('://');

            // Build redis key for this proxy.
            var redisKey = ['frontend', url].join(':');

            // Get port for this proxy from port information.
            var port = _.get(ports, '[' + proxy.port + '][0].HostPort', null);

            // If we have ports then do the mapping
            if (port) {

              // Build our destinations.
              var dest = [protocol, '://', REDIS_IP, ':', port].join('');
              var containerName = _.trimLeft(data.Name, '/');

              // Attempt to connect to redis
              return getRedisClient()

              // Run the redis query and then quit
              .then(function(redis) {
                log.debug(format('Setting DNS. %s => %s', redisKey, dest));
                return Promise.fromNode(function(cb) {
                  redis.multi()
                  .del(redisKey)
                  .rpush(redisKey, containerName)
                  .rpush(redisKey, dest)
                  .exec(cb);
                })
                .then(function() {
                  redis.quit();
                });
              });

            }
          }, {concurrency: 1});

        });

      });
    });
  });
};
