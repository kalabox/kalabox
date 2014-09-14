var redis = require('redis');
var config = require('./config.json');

/**
 * This is how to define tasks which are accessible
 * by kbox and other plugins.
 */
exports.tasks = {
  foo: function() {
    console.log('bar');
  }
};

/**
 * Add proxy records to hipache.
 *
 * @param docker
 * @param app
 * @param done
 */
exports.postStart = function(docker, app, done) {

};

/**
 * Add proxy records for this app into hipache.
 *
 * Called on each component after it has been started.
 *
 * @param docker The dockerode object.
 * @param app The application object.
 * @param component The component that was just started.
 * @param done Callback to indicate this operation is done.
 */
exports.postStartComponent = function(docker, app, component, done) {
  // Setup the hipache proxy via redis
  if (component.proxy) {
    var c = docker.getContainer(component.cid);

    c.inspect(function(err, data2) {
      for (var x in component.proxy) {
        var proxy = component.proxy[x];
        var client = redis.createClient(config.redis.port, config.redis.host);
        var hostname = proxy.default ? component.app.hostname : component.hostname;
        var rkey = 'frontend:' + hostname;

        if (data2 && data2.NetworkSettings.Ports[proxy.port]) {
          var port = data2.NetworkSettings.Ports[proxy.port][0].HostPort;

          client.multi()
            .del(rkey)
            .rpush(rkey, component.cname)
            .rpush(rkey, config.host + ':' + port)
            .exec(function (err, replies) {
              if (err) throw err;
              done();
              client.quit();
            });
        }
      }
    });
  }
};

/**
 * Remove the proxy record from hipache.
 *
 * This is called on each component after it has been removed.
 *
 * @param docker The dockerode object.
 * @param app The application object.
 * @param component The component that was just started.
 * @param done Callback to indicate this operation is done.
 */
exports.postRemoveComponent = function(docker, app, component, done) {
  // Setup the hipache proxy via redis
  if (component.proxy) {
    var c = docker.getContainer(component.cid);
    c.inspect(function(err, data2) {
      for (var x in component.proxy) {
        var proxy = component.proxy[x];
        var client = redis.createClient(config.redis.port, config.redis.host);
        var hostname = proxy.default ? component.app.hostname : component.hostname;
        var rkey = 'frontend:' + hostname;

       client.del(rkey, function (err, replies) {
         if (err) throw err;
         done();
         client.quit();
       });
      }
    });
  }
};