'use strict';

module.exports = function(kbox) {

  var _ = require('lodash');
  var redis = require('redis');
  var VError = require('verror');
  var pp = kbox.util.pp;

  var REDIS_PORT = 8160;

  var Promise = kbox.Promise;
  var events = kbox.core.events.context();

  /*
   * Logging functions.
   */
  var log = kbox.core.log.make('HIPACHE');

  /**
   * Listens for post-start-component
   * - Creates a proxy record via redis for components with proxy definitions.
   */
  events.on('post-start-component', function(cmp, done) {

    if (cmp.proxy) {

      // IP address of the hipache redis server.
      var redisIp = kbox.core.deps.get('engineConfig').host;

      // Connect to the hipache redis server.
      var redisClient = redis.createClient(REDIS_PORT, redisIp);

      // Query engine for component container's information.
      kbox.engine.inspect(cmp.containerId)
      .then(function(data) {

        // Get port information from container query.
        var portInfo = _.get(data, 'NetworkSettings.Ports');

        // Options for looping through each proxy.
        var mapOpts = {concurrency: 1};

        // Loop through each proxy.
        return Promise.map(cmp.proxy, function(proxy) {

          // Should this proxy mapping be just the domain, or should
          // it have a subdomain.
          var hostname = proxy.default ? cmp.appDomain : cmp.hostname;
          var protocol = proxy.secure ? 'https' : 'http';
          var url = [protocol, hostname].join('://');
          // Build redis key for this proxy.
          var redisKey = ['frontend', url].join(':');

          // Get port for this proxy from port information.
          var port = _.get(portInfo, '[' + proxy.port + '][0].HostPort', null);

          if (port) {

            // Build a destination.
            var destination = [protocol, '://', redisIp, ':', port].join('');

            // Log each DNS record being added.
            _.each([cmp.containerName, destination], function(address) {
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
              .rpush(redisKey, cmp.containerName)
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
          pp(cmp)
        );
      })
      // Make sure we disconnect from redis server.
      .finally(function() {
        redisClient.quit();
      })
      // Return.
      .nodeify(done);

    } else {

      done();

    }

  });

  /**
   * Listens for post-start-component
   * - Removes proxy records via redis.
   */
  events.on('post-uninstall-component', function(cmp, done) {

    if (cmp.proxy) {

      // IP address of the hipache redis server.
      var redisIp = kbox.core.deps.get('engineConfig').host;

      var redisClient = null;

      // Connect to the hipache redis server.
      return Promise.try(function() {
        return Promise.fromNode(function(cb) {
          redisClient = redis.createClient(REDIS_PORT, redisIp);
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
        return Promise.map(cmp.proxy, function(proxy) {

          // Should this proxy mapping be just the domain, or should
          // it have a subdomain.
          var hostname = proxy.default ? cmp.appDomain : cmp.hostname;

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
            pp(cmp)
          );
        }
      })
      // Make sure we end connection to redis server.
      .finally(function() {
        if (redisClient) {
          redisClient.end();
        }
      })
      // Return.
      .nodeify(done);

    } else {

      done();

    }

  });

};
