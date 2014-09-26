'use strict';

var path = require('path');
var rsync = require("rsyncwrapper").rsync;

module.exports = function(plugin, manager, app) {
  app.manager.registerTask('rsync', function(){
    var container = app.docker.getContainer(app.config.components.data.cid);
    container.inspect(function(err, data){
      var dataPath = data.Volumes[plugin.volume];
      var dest = 'rsync://root@1.3.3.7:873' + path.resolve(dataPath, plugin.dest);

      rsync({
          src: plugin.src,
          dest: dest,
          recursive: plugin.recursive,
          exclude: plugin.exclude,
          deleteAll: plugin.deleteAll
        },
        function (error, stdout, stderr, cmd) {
          console.log(cmd);
          if (err) {
            console.log(error.message);
          }
        }
      );

    });
  });
};