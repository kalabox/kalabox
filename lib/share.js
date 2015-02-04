'use strict';

var engine = require('./engine.js');
var _ = require('lodash');

var getDataContainerNames = function(cb) {
  engine.list(function(err, containers) {
    if (err) {
      cb(err);
    } else {
      var dataContainers = _.filter(containers, function(container) {
        // @todo: this is jank as hell, and needs to be standardized
        // reused across all of kalabox.
        var parts = container.name.split('_');
        return parts.length === 3 && parts[0] === 'kb' && parts[2] === 'data';
      });
      cb(null, dataContainers);
    }
  });
};

var restart = exports.restart = function(cb) {
  getDataContainerNames(function(err, containers) {
    if (err) {
      cb(err);
    } else {
      var rec = function(containers, binds, done) {
        if (containers.length === 0) {
          done(binds);
        } else {
          var hd = containers[0];
          var tl = containers.slice(1);
          engine.inspect(hd.name, function(err, data) {
            if (err) {
              cb(err);
            } else {
              if (data.Volumes['/data']) {
                var bind = [
                  data.Volumes['/data'],
                  '/' + hd.app
                ].join(':');
                binds.push(bind);
              }
              rec(tl, binds, done);
            }
          });
        }
      };
      rec(containers, [], function(binds) {
        //var volumes = binds.join(',');
        var startOptions = {
          Binds: binds
          /*HostConfig: {
            Volumes: binds
          }*/
        };
        /*HostConfig: {
          Binds: binds
        }*/
        console.log('debug-4');
        engine.stop('kalabox_syncthing', function(err) {
          if (err) {
            cb(err);
          } else {
            console.log('debug-3: ' + JSON.stringify(startOptions, null, '  '));
            engine.start('kalabox_syncthing', startOptions, function(err) {
              if (err) {
                cb(err);
              } else {
                cb();
              }
            });
          }
        });
      });
    }
  });
};
