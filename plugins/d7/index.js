'use strict';

var argv = require('minimist')(process.argv.slice(2));

module.exports = function(plugin, manager, app) {

  app.manager.registerTask('d7.install', function() {
    var profile = 'standard';
    if (argv._[1]) {
      profile = argv._[1];
    }
    var theme = 'garland';
    if (argv._[2]) {
      theme = argv._[2];
    }

    app.docker.run(
      'kalabox/ubuntu',
      ['/bin/sh', '/data/scripts/install.sh'],
      process.stdout,
      {
        'Env': ['APPDOMAIN=' + app.appdomain, 'DRUPAL_PROFILE=' + profile, 'DRUPAL_THEME=' + theme]
      },
      {
        'VolumesFrom': app.dataCname,
        'Links': [app.components.db.cname + ':db']
      },
      function(err, data, container) {
        app.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  });

  app.manager.registerTask('d7.status', function() {
    app.docker.run(
      'kalabox/drush',
      ['@dev', 'status'],
      process.stdout,
      {
        'Env': ['APPDOMAIN=' + app.appdomain]
      },
      {
        'VolumesFrom': app.dataCname,
        'Links': [app.components.db.cname + ':db']
      },
      function(err, data, container) {
        app.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  });
};
