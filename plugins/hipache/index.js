'use strict';

var redis = require('redis');

module.exports = function(app, docker) {

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
          var client = redis.createClient(6379, '1.3.3.7');
          var hostname = proxy.default ? app.appDomain : component.hostname;
          var rkey = 'frontend:' + hostname;

          if (data && data.NetworkSettings.Ports[proxy.port]) {

            var port = data.NetworkSettings.Ports[proxy.port][0].HostPort;
            var dst = 'http://1.3.3.7' + ':' + port;


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
          var client = redis.createClient(6379, '1.3.3.7');
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
