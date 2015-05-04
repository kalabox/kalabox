'use strict';

var fs = require('fs-extra');
var path = require('path');

/**
 * This contains all the core commands that kalabox can run on every machine
 */

module.exports = function(kbox) {

  var events = kbox.core.events;
  var deps = kbox.core.deps;

  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'install'];
      task.description = 'Install a kbox application.';
      task.options.push({
        name: 'build-local',
        kind: 'boolean',
        description: 'Build images locally instead of pulling them remotely.'
      });
      task.func = function(done) {
        // Install the data container before our things
        // Do this event ONLY when install is run
        // @todo: what would this do on the GUI?
        events.on('pre-install', function(app, done) {
          var dataImage = {
            name: 'kalabox/data:dev',
            srcRoot: deps.lookup('globalConfig').srcRoot
          };
          var containerName = ['kb', app.name, 'data'].join('_');
          kbox.engine.build(dataImage, function() {
            kbox.engine.create(
              {
                Image: dataImage.name,
                name: containerName
              },
              function(err, container) {
                if (err) {
                  done(err);
                }
                else {
                  var containerIdFile = path.join(
                    app.config.appCidsRoot,
                    'data'
                  );
                  fs.writeFileSync(
                    path.resolve(containerIdFile), container.cid
                  );
                  done();
                }
              }
            );
          });
        });

        // Actually do the app install
        kbox.app.install(app, done);
      };
    });
  });

};
