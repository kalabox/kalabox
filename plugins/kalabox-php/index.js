
'use strict';

module.exports = function(kbox) {

  // Node modules
  var path = require('path');

  // NPM modules
  var _ = require('lodash');

  /*
   * App package location.
   * NOTE: if in dev mode and not in a binary this should be internal. Internal
   * locations are relative to the node_modules folder
   * All
   * other modes should be an URL to an archive and then the path location of the app
   * relative to the archive root
   */
  var packageData = function() {

    // Kbox mods
    var util = kbox.util;

    // Get relevant config options
    var config = util.yaml.toJson(path.join(__dirname, 'lib', 'config.yml'));
    var isBinary = kbox.core.deps.get('globalConfig').isBinary;
    var locked = kbox.core.deps.get('globalConfig').locked;

    // Return an internal path
    if (!isBinary && !locked) {
      var srcRoot = kbox.core.deps.get('globalConfig').srcRoot;
      var modFold = path.join(srcRoot, 'node_modules');
      return {
        path: path.join(modFold, config.path.base, config.path.path)
      };
    }
    // Return a url of an archive
    else {
      var format = (process.platform === 'win32') ? 'zipball' : 'tarball';
      var branch = (!locked) ? config.url.dev : config.url.prod;
      var url = [config.url.base, format, branch].join('/');
      return {
        url: url,
        path: config.url.path,
        folder: config.url.folder
      };
    }

  };

  // List of viable frameworks
  var frameworks = [
    'drupal7',
    'drupal8'
  ];

  // Load our events and create modules
  require('./lib/create.js')(kbox, frameworks);
  require('./lib/events.js')(kbox);

  _.forEach(frameworks, function(framework) {
    // Declare our apps to the world
    kbox.create.add(framework, {
      task: {
        name: _.capitalize(framework),
        description: ['Creates a', framework, 'app'].join(' '),
        pkg: packageData()
      }
    });

    // Task to create kalabox apps
    kbox.tasks.add(function(task) {
      kbox.create.buildTask(task, framework);
    });
  });

};
