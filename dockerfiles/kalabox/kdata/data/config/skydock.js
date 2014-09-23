function createService(container) {
  var arr = container.Config.Hostname.split('.');
  return {
    Port: 80,
    Environment: arr[1],
    TTL: defaultTTL,
    Service: arr[0],
    Instance: removeSlash(container.Name).substring(3),
    Host: container.NetworkSettings.IpAddress
  };
}