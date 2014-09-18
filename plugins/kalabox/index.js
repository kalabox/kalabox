module.exports = function(plugin, app) {

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

};