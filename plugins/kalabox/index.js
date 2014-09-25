var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var rimraf = require('rimraf');
var chalk = require('chalk');

module.exports = function(plugin, manager, app) {

  manager.registerTask(app, 'list', function(){
    var i = 1;
    manager.getApps(function(apps) {
      console.log('');

      _(apps).each(function(a) {
        var status = '';
        if (a.status == 'enabled') {
          status = 'Enabled';
          console.log(chalk.green(" " + i + ". " + a.config.title + " (" + a.name + ")\t\t", a.url + "\t\t", status));
        }
        else if (a.status == 'disabled') {
          status = 'Disabled';
          console.log(chalk.magenta(" " + i + ". " + a.config.title + " (" + a.name + ")\t\t", a.url + "\t\t", status));
        }
        else {
          status = 'Uninstalled';
          console.log(chalk.red(" " + i + ". " + a.config.title + " (" + a.name + ")\t\t", a.url + "\t\t", status));
        }
        i++;
      });
      console.log('');
    });
  });

  manager.registerTask(app, 'purge', function(){
    rimraf.sync(app.dataPath);
  });

  manager.registerTask(app, 'init', function(){
    manager.init(app);
  });

  manager.registerTask(app, 'start', function(){
    manager.start(app);
  });

  manager.registerTask(app, 'stop', function(){
    manager.stop(app);
  });

  manager.registerTask(app, 'restart', function(){
    manager.restart(app);
  });

  manager.registerTask(app, 'kill', function(){
    manager.kill(app);
  });

  manager.registerTask(app, 'remove', function(){
    manager.remove(app);
  });

  manager.registerTask(app, 'pull', function(){
    manager.pull(app);
  });

  manager.registerTask(app, 'build', function(){
    manager.build(app);
  });

  app.on('post-init', function(){
    var a = _.cloneDeep(app);
    delete a.components;
    fs.writeFileSync(path.resolve(app.dataPath, 'app.json'), JSON.stringify(a));
  });

};