'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var argv = require('minimist')(process.argv.slice(3));

module.exports = function(plugin, manager, app) {

  // Drush wrapper: kbox drush status
  app.manager.registerTask('drush', function(){
    var args = argv._;
    args.unshift('@dev');

    app.docker.run(
      'kalabox/drush',
      args,
      process.stdout,
      {
        Env: ['APPNAME=' +  app.appname, 'APPDOMAIN=' +  app.appdomain],
        Volumes: { '/src': {} }
      },
      {
        Binds: [app.path + ':/src:rw']
      },
      function (err, data, container) {
        app.manager.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  });

  // Updates kalabox aliases when app is started.
  // This allows for both kbox drush to be used
  // and local drush to be used via: drush @<appname> status
  app.on('post-start-component', function(component) {
    // Only run on the db container
    if (component.key != 'db') {
      return;
    }

    // Create a symlink from the local.aliases.drushrc.php file to ~/.drush/kalabox/<appname>.aliases.drushrc.php
    var copyLocalAlias = function(app) {
      var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
      var drushPath = path.resolve(home, '.drush');
      // Create ~/.drush dir if it doesn't exist.
      if (!fs.existsSync(drushPath)) {
        fs.mkdirSync(drushPath);
      }
      // Create ~/.drush/kalabox dir if it doesn't exist.
      var drushKalaboxPath = path.resolve(drushPath, 'kalabox');
      if (!fs.existsSync(drushKalaboxPath)) {
        fs.mkdirSync(drushKalaboxPath);
      }

      // Define the paths
      var src = path.resolve(app.path, app.profilePath, 'config', 'drush', 'local.aliases.drushrc.php');
      var dst = path.resolve(drushKalaboxPath, app.appdomain + '.aliases.drushrc.php');

      // Create the symlink
      if (!fs.existsSync(dst)) {
        fs.symlinkSync(src, dst);
      }
    };

    var c = app.docker.getContainer(component.cid);
    c.inspect(function(err, data) {

      var key = '3306/tcp';
      if (data && data.NetworkSettings.Ports[key]) {
        var port = data.NetworkSettings.Ports[key][0].HostPort;
        var commands = [
          [
            'sed',
            '-i',
            "s/'host'.*/'host' => '" + app.appdomain + "',/g",
            '/src/.kalabox/config/drush/aliases.drushrc.php'
          ],
          [
            'sed',
            '-i',
            "s/aliases\\['.*/aliases['" + app.name + "'] = array(/g",
            '/src/.kalabox/config/drush/local.aliases.drushrc.php'
          ],
          [
            'sed',
            '-i',
            "s@'root'.*@'root' => '" + app.path + "/public',@g",
            '/src/.kalabox/config/drush/local.aliases.drushrc.php'
          ],
          [
            'sed',
            '-i',
            "s%'db-url.*%'db-url' => 'mysql://kalabox@" + app.appdomain + ":" + port + "/kalabox',%g",
            '/src/.kalabox/config/drush/local.aliases.drushrc.php'
          ]
        ];

        _.map(commands, function(cmd) {
          app.docker.run(
            'kalabox/debian',
            cmd,
            process.stdout,
            {
              'Env': ['APPDOMAIN=' + app.appdomain],
              Volumes: { '/src': {} }
            },
            {
              Binds: [app.path + ':/src:rw']
            },
            function (err, data, container) {
              console.log(err);
              app.manager.docker.getContainer(container.id).remove(function(err, data) {
              });
            }
          );
        });

        copyLocalAlias(app);
      }
    });
  });

};
