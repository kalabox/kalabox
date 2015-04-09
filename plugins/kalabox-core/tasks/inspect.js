'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var _ = require('lodash');
var async = require('async');

module.exports = function(kbox) {

  kbox.whenApp(function(app) {
    kbox.tasks.add(function(task) {
      task.path = [app.name, 'inspect'];
      task.description = 'Inspect containers.';
      task.kind = 'argv*';
      task.func = function(done) {
        var targets = this.argv;
        kbox.engine.list(app.name, function(err, containers) {
          if (err) {
            done(err);
          } else {
            // Map argv to containers.
            targets = _.map(targets, function(target) {
              var result = _.find(containers, function(container) {
                return container.name === target;
              });
              if (!result) {
                done(new Error('No container named: ' + target));
              } else {
                return result;
              }
            });
            // Inspect each container and output data.
            async.eachSeries(targets,
            function(target, next) {
              kbox.engine.inspect(target.id, function(err, data) {
                if (err) {
                  next(err);
                } else {
                  console.log(data);
                  next();
                }
              });
            },
            function(err) {
              done(err);
            });
          }
        });
      };
    });
  });

};
