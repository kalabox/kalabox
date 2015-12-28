'use strict';

/* jshint ignore:start */
function createService(container) {
  var arr = container.Config.Hostname.split('.');
  return {
    Port: 80,
    Environment: arr[1],
    TTL: '2147483647',
    Service: arr[0],
    Instance: removeSlash(container.Name).substring(3),
    Host: container.NetworkSettings.IpAddress
  };
}
/* jshint ignore:end */
