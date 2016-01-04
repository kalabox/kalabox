'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  /*
   * Return true if container matches query.
   */
  var isContainerMatch = function(container, appName, query) {

    // Match query against container's id.
    var isContainerId = query === container.id;

    // Match query against container's name.
    var isContainerName = query === container.name;

    // Match query against component's name.
    var isComponentName = (function() {
      var o = kbox.util.docker.containerName.parse(container.name);
      return o.app === appName && o.name === query;
    })();

    return isContainerId || isContainerName || isComponentName;

  };

  return {
    isContainerMatch: isContainerMatch,
  };

};
