'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');
  var format = require('util').format;
  var u = require('url');

  // Npm modules
  var _ = require('lodash');
  var redis = require('redis');

  // Kalabox modules
  var Promise = kbox.Promise;

  // Logging
  var log = kbox.core.log.make('SERVICES PLUGIN');

  /*
   * Return the proxy service
   */
  var getCoreServices = function() {
    return {
      compose: [path.resolve(__dirname, '..', 'kalabox-compose.yml')],
      project: 'kalabox',
      opts: {
        services: ['proxy'],
        internal: true
      }
    };
  };

  /*
   * App events
   */
  kbox.core.events.on('post-app-load', function(app) {

    // Grab our services config
    var proxyConfig = app.config.pluginconfig.services || {};

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
     * Parse a route config object into an array of URLs
     */
    var getRouteUrls = function(route) {

      // Start with a hostnames collector
      var hostnames = [];

      // Handle 'default' key
      if (route.default) {
        hostnames.push([app.name, app.domain].join('.'));
      }

      // Handle legacy 'hostname' key
      if (route.hostname) {
        hostnames.push([route.hostname, app.name, app.domain].join('.'));
      }

      // Handle 'subdomains'
      if (route.subdomains) {
        _.forEach(route.subdomains, function(subdomain) {
          hostnames.push([subdomain, app.name, app.domain].join('.'));
        });
      }

      // Handle 'custom'
      if (route.custom) {
        _.forEach(route.custom, function(url) {
          hostnames.push(url);
        });
      }

      // Determine whether the protocol is http or https
      var protocol = (route.secure) ? 'https://' : 'http://';

      // Return an array of parsed hostnames
      return _.map(hostnames, function(hostname) {
        return protocol + hostname;
      });

    };

    /*
     * Get a list of URLs and their counts
     */
    var getUrlsCounts = function(services) {
      // Get routes and flatten
      var routes = _.flatten(_.pluck(services, 'routes'));
      // Get URLs and flatten
      var urls = _.flatten(_.pluck(routes, 'urls'));
      // Check for duplicate URLs
      return _.countBy(urls);
    };

    /*
     * Parse our config into an array of service objects and do
     * some basic validation
     */
    var parseServices = function(config) {

      // Transform our config into services objects
      var services = _.map(config, function(data, key) {

        // Map each route into an object of ports and urls
        var routes = _.map(data, function(route) {
          return {
            port: route.port,
            urls: getRouteUrls(route)
          };
        });

        // Return the service
        return {
          name: key,
          routes: routes
        };

      });

      // Get a count of the URLs so we can check for dupes
      var urlCount = getUrlsCounts(services);
      var hasDupes = _.reduce(urlCount, function(result, count) {
        return count > 1 || result;
      }, false);

      // Throw an error if there are dupes
      if (hasDupes) {
        throw new Error(format('Duplicate URL detected: %j', urlCount));
      }

      // Return the list
      return services;

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

    /*
     * Adds an entry to redis
     *
     * This allows us to retry the connection a few times just in case redis
     * is slow to start
     */
    var addRedisEntry = function(key, dest, containerName) {

      // Attempt to connect to redis
      return getRedisClient()

      // Run the redis query and then quit
      .then(function(redis) {
        log.debug(format('Setting DNS. %s => %s', key, dest));
        return Promise.fromNode(function(cb) {
          redis.multi()
          .del(key)
          .rpush(key, containerName)
          .rpush(key, dest)
          .exec(cb);
        })
        .then(function() {
          redis.quit();
        });
      });

    };

    /**
     * Creates a proxy record via redis for components with proxy definitions.
     */
    app.events.on('post-start', 1, function() {

      // Make sure the core proxy service is started up
      return kbox.engine.start(getCoreServices())

      // Parse the config into an array of services objects
      .then(function() {
        return parseServices(proxyConfig);
      })

      // Go through those services one by one and add dns entries
      .each(function(service) {

        // Log the service getting confed
        log.debug(format('Configuring DNS for %s services.', service.name));

        // Inspect the service to be proxies
        return kbox.engine.inspect(getAppService(service.name))

        // Grab our port information from docker
        .then(function(data) {

          // Get port information from container query.
          var ip = _.get(data, 'NetworkSettings.Networks.bridge.IPAddress');

          // Loop through each proxy.
          return Promise.map(service.routes, function(route) {

            // Get port for this proxy from port information.
            var port = route.port.split('/')[0];

            // Loop through each url and add an entry to redis
            return Promise.map(route.urls, function(url) {
              return addRedisEntry(
                ['frontend', url].join(':'),
                u.parse(url).protocol + '//' + ip + ':' + port,
                _.trimLeft(data.Name, '/')
              );
            });

          });
        });
      });
    });
  });

  /*
   * App events
   */
  kbox.core.events.on('pre-engine-down', 8, function() {
    return kbox.engine.stop(getCoreServices());
  });

};
