'use strict';

var redis = require('redis');
var async = require('async');

module.exports = function(kbox, app) {
  var engine = kbox.engine;
  var events = kbox.core.events;
  var globalConfig = kbox.core.config.getGlobalConfig();
  // Redis information.
  var redisPort = 8160;
  var logDebug = kbox.core.log.debug;

  /**
   * Listens for post-start-component
   * - Creates a proxy record via redis for components with proxy definitions.
   */
  events.on('post-start-component', function(component, done) {
    if (component.proxy) {
      engine.inspect(component.containerId, function(err, data) {
        var redisHost = kbox.core.deps.lookup('engineConfig').host;
        async.map(component.proxy, function(proxy, next) {
          var client = redis.createClient(redisPort, redisHost);
          var hostname = proxy.default ? app.domain : component.hostname;
          var rkey = 'frontend:' + hostname;
          if (data && data.NetworkSettings.Ports[proxy.port]) {
            var port = data.NetworkSettings.Ports[proxy.port][0].HostPort;
            var dst = ['http://', redisHost, ':', port].join('');
            var debugState = {
              redisHost: redisHost,
              client: client,
              hostname: hostname,
              rkey: rkey,
              port: port,
              dst: dst
            };
            logDebug('HIPACHE => Start component.', debugState);
            client.multi()
              .del(rkey)
              .rpush(rkey, component.containerName)
              .rpush(rkey, dst)
              .exec(function(err, replies) {
                if (err) {
                  next(err);
                } else {
                  client.quit();
                  next(null);
                }
              });
          } else {
            next(null);
          }
        }, done);
      });
    } else {
      done();
    }
  });

  /**
   * Listens for post-start-component
   * - Removes proxy records via redis.
   */
  events.on('post-remove-component', function(component, done) {
    // Setup the hipache proxy via redis
    if (component.proxy) {
      engine.inspect(component.containerId, function(err, data) {
        var redisHost = kbox.core.deps.lookup('engineConfig').host;
        for (var x in component.proxy) {
          var proxy = component.proxy[x];
          var client = redis.createClient(redisPort, redisHost);
          var hostname = proxy.default ? app.domain : component.hostname;
          var rkey = 'frontend:' + hostname;

          var debugState = {
            redisHost: redisHost,
            proxy: proxy,
            client: client,
            hostname: hostname,
            rkey: rkey
          };
          logDebug('HIPACHE => Stop component.', debugState);
          client.del(rkey, function(err, replies) {
            if (err) { throw err; }
            client.quit();
            done();
          });
        }
      });
    } else {
      done();
    }
  });
};
