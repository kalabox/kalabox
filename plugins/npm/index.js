var path = require('path');

module.exports = function(plugin, manager, app) {
  app.manager.registerTask(app, 'npm.install', function(){
    app.docker.run(
      'kalabox/nodejs',
      ['npm', 'install'],
      process.stdout,
      {
        'Env': ['APPDOMAIN=' + app.appdomain],
        'WorkingDir': '/data/code'
      },
      {
        'VolumesFrom': app.dataCname
      },
      function (err, data, container) {
        app.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  });
};