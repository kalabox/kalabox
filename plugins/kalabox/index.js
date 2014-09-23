var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var chalk = require('chalk');

var baseDir = path.resolve(__dirname, '../../');
var config = require(path.resolve(baseDir, 'config.json'));

// Data path setup ~/.kalabox
var homePath = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
var dataPath = path.resolve(homePath, '.kalabox');
var appPath = path.resolve(dataPath, 'apps');

module.exports = function(plugin, app) {

  app.manager.RegisterTask(app, 'list', function(){
    var i = 1;
    app.manager.GetApps(function(apps) {
      console.log('');

      _(apps).each(function(a) {
        var status = '';
        if (a.status == 'enabled') {
          status = 'Enabled';
          console.log(chalk.green(" " + i + ". " + a.config.title + " (" + a.appname + ")\t\t", a.url + "\t\t", status));
        }
        else if (a.status == 'disabled') {
          status = 'Disabled';
          console.log(chalk.magenta(" " + i + ". " + a.config.title + " (" + a.appname + ")\t\t", a.url + "\t\t", status));
        }
        else {
          status = 'Uninstalled';
          console.log(chalk.red(" " + i + ". " + a.config.title + " (" + a.appname + ")\t\t", a.url + "\t\t", status));
        }
        i++;
      });
      console.log('');
    });
  });

  app.manager.RegisterTask(app, 'init', function(){
    app.init();
  });

  app.manager.RegisterTask(app, 'start', function(){
    app.start();
  });

  app.manager.RegisterTask(app, 'stop', function(){
    app.stop();
  });

  app.manager.RegisterTask(app, 'restart', function(){
    app.restart();
  });

  app.manager.RegisterTask(app, 'kill', function(){
    app.kill();
  });

  app.manager.RegisterTask(app, 'remove', function(){
    app.remove();
  });

  app.manager.RegisterTask(app, 'pull', function(){
    app.pull();
  });

  app.manager.RegisterTask(app, 'build', function(){
    app.build();
  });

  app.on('post-init', function(){
    var a = _.cloneDeep(app);
    delete a.components;
    fs.writeFileSync(path.resolve(app.dataPath, 'app.json'), JSON.stringify(a));
  });

};