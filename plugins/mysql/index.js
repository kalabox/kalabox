'use strict';

module.exports = function(plugin, manager, app) {

  app.manager.registerTask('mysql.uname', function(){
    app.docker.run(
      'ubuntu',
      ['bash', '-c', 'uname -a'],
      process.stdout,
      {
        'Rm': true,
        'Env': '["APPDOMAIN="' + app.domain + '"]',
        'VolumesFrom': app.dataCname
      },
      function (err, data, container) {
        app.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  });

  app.manager.registerTask('mysql.appdomain', function(){
    app.docker.run(
      'ubuntu',
      ['bash', '-c', 'echo $APPDOMAIN'],
      process.stdout,
      {
        'Env': ['APPDOMAIN=' + app.appdomain, 'forcerm=1'],
        'VolumesFrom': app.dataCname
      },
      function (err, data, container) {
        app.docker.getContainer(container.id).remove(function(err, data) {
        });
      }
    );
  });
};
