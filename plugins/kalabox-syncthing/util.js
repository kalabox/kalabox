'use strict';

/**
 * This contains all the core commands that kalabox can run on every machine
 */

var fs = require('fs');
var path = require('path');
var meta = require('./meta.js');
var mkdirp = require('mkdirp');
var Decompress = require('decompress');

module.exports = function(kbox) {

  var installSyncthing = function(sysConfRoot, callback) {
    console.log(sysConfRoot);
    // Get the download location.
    var tmp = kbox.util.disk.getTempDir();
    // Move config from download location to the correct location.
    var syncthingDir = path.join(sysConfRoot, 'syncthing');
    mkdirp.sync(syncthingDir);
    var config = path.join(
      tmp,
      path.basename(meta.SYNCTHING_CONFIG_URL)
    );
    fs.renameSync(config, path.join(syncthingDir, path.basename(config)));

    // Install syncthing binary.
    var filename =
      path.basename(meta.SYNCTHING_DOWNLOAD_URL[process.platform]);
    var binary = path.join(tmp, filename);
    var decompress;
    if (process.platform === 'win32') {
      decompress = new Decompress({mode: '755'})
        .src(binary)
        .dest(tmp)
        .use(Decompress.zip());
    }
    else {
      decompress = new Decompress({mode: '755'})
        .src(binary)
        .dest(tmp)
        .use(Decompress.targz());
    }
    decompress.run(function(err, files, stream) {
      if (err) {
        callback(err);
      } else {
        var binDir = path.join(sysConfRoot, 'bin');
        mkdirp.sync(binDir);
        var bin =
          (process.platform === 'win32') ? 'syncthing.exe' : 'syncthing';
        var ext = (process.platform === 'win32') ? '.zip' : '.tar.gz';
        fs.renameSync(
          path.join(tmp, path.basename(binary, ext), bin),
          path.join(binDir, bin)
        );
        fs.chmodSync(path.join(binDir, bin), '0755');
        callback();
      }
    });
  };

  return {
    installSyncthing: installSyncthing
  };

};
