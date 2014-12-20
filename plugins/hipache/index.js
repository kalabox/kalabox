'use strict';

var redis = require('redis');

module.exports = function(app, globalConfig, docker) {
  // Redis information.
  var redisHost = globalConfig.redis.host;
  var redisPort = globalConfig.redis.port;
  var redisUrl = ['http://', redisHost, ':', reditPort].join('');

  /**
   * Listens for post-start-component
   * - Creates a proxy record via redis for components with proxy definitions.
   */
  app.on('post-start-component', function(component) {
    if (component.proxy) {
      var c = docker.getContainer(component.cid);
      c.inspect(function(err, data) {
        for (var x in component.proxy) {
          var proxy = component.proxy[x];
          var client = redis.createClient(redisPort, redisHost);
          var hostname = proxy.default ? app.appDomain : component.hostname;
          var rkey = 'frontend:' + hostname;
          if (data && data.NetworkSettings.Ports[proxy.port]) {
            var port = data.NetworkSettings.Ports[proxy.port][0].HostPort;
            var dst = redisUrl;
            client.multi()
              .del(rkey)
              .rpush(rkey, component.cname)
              .rpush(rkey, dst)
              .exec(function(err, replies) {
                if (err) { throw err; }
                client.quit();
              });
          }
        }
      });
    }
  });

  /**
   * Listens for post-start-component
   * - Removes proxy records via redis.
   */
  app.on('post-remove-component', function(component) {
    // Setup the hipache proxy via redis
    if (component.proxy) {
      var c = docker.getContainer(component.cid);
      c.inspect(function(err, data) {
        for (var x in component.proxy) {
          var proxy = component.proxy[x];
          var client = redis.createClient(redisPort, redisHost);
          var hostname = proxy.default ? app.appDomain : component.hostname;
          var rkey = 'frontend:' + hostname;

          client.del(rkey, function(err, replies) {
            if (err) { throw err; }
            client.quit();
          });
        }
      });
    }
  });
};
