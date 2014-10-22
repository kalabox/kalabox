'use strict';

var redis = require('redis');

module.exports = function(plugin, manager, app) {
  /**
   * Listens for post-start-component
   * - Creates a proxy record via redis for components with proxy definitions.
   */
  app.on('post-start-component', function(component) {
    if (component.proxy) {
      var c = app.docker.getContainer(component.cid);
      c.inspect(function(err, data) {
        for (var x in component.proxy) {
          var proxy = component.proxy[x];
          var client = redis.createClient(component.app.kconfig.redis.port, component.app.kconfig.redis.host);
          var hostname = proxy.default ? app.appdomain : component.hostname;
          var rkey = 'frontend:' + hostname;

          console.log(component.app.kconfig.redis);
          console.log(hostname);
          console.log(rkey);
          console.log(port);

          if (data && data.NetworkSettings.Ports[proxy.port]) {
            var port = data.NetworkSettings.Ports[proxy.port][0].HostPort;
            var dst = 'http://' +component.app.kconfig.dockerHost + ':' + port;

            client.multi()
              .del(rkey)
              .rpush(rkey, component.cname)
              .rpush(rkey, dst)
              .exec(function (err, replies) {
                if (err) throw err;
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
      var c = app.docker.getContainer(component.cid);
      c.inspect(function(err, data) {
        for (var x in component.proxy) {
          var proxy = component.proxy[x];
          var client = redis.createClient(component.app.kconfig.redis.port, component.app.kconfig.redis.host);
          var hostname = proxy.default ? app.appdomain : component.hostname;
          var rkey = 'frontend:' + hostname;

          client.del(rkey, function (err, replies) {
            if (err) throw err;
            client.quit();
          });
        }
      });
    }
  });
};
