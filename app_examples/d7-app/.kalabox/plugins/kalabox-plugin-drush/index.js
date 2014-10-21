'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');

module.exports = function(plugin, manager, app) {

  app.on('post-start-component', function(component) {
    if (component.key != 'db') {
      return;
    }

    var copyLocalAlias = function(app) {
      var home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
      var drushPath = path.resolve(home, '.drush');
      if (!fs.existsSync(drushPath)) {
        fs.mkdirSync(drushPath);
      }
      var drushKalaboxPath = path.resolve(drushPath, 'kalabox');
      if (!fs.existsSync(drushKalaboxPath)) {
        fs.mkdirSync(drushKalaboxPath);
      }

      var src = path.resolve(app.path, app.profilePath, 'config', 'drush', 'local.aliases.drushrc.php');
      var dst = path.resolve(drushKalaboxPath, app.appdomain + '.aliases.drushrc.php');

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
            'kalabox/ubuntu',
            cmd,
            process.stdout,
            {
              'Env': ['APPDOMAIN=' + app.appdomain]
            },
            {
              Binds: [app.path + ':/src:rw']
            },
            function (err, data, container) {
              app.docker.getContainer(container.id).remove(function(err, data) {
              });
            }
          );
        });

        copyLocalAlias(app);
      }
    });
  });


};