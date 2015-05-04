'use strict';

var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var krun = require('./krun.js');
var path = require('path');
var sha1 = require('sha1');
var randomstring = require('randomstring');
var Promise = require('bluebird');

var remote = function(container, filepath) {

  // Object containing all methods returned by each call.
  var api = {
    container: container,
    data: {},
    filepath: filepath,
    __isRemote: true
  };

  /*
   * Add a promise to the end of the promise chain.
   */
  var chain = function(fn) {
    if (api.p) {
      api.p = api.p.then(fn);
    } else {
      api.p = Promise.resolve().then(fn);
    }
  };

  /*
   * Check if api.filepath exists, and save result to api.data.exists.
   */
  var exists = function() {

    chain(function() {
    
      return new Promise(function(fulfill, reject) {

        var cmd = 'kbox query ' + api.container +
          ' ls -l ' + api.filepath;

        krun().run(cmd).ok().call(function(done) {

          if (_.contains(this.output, 'No such file or directory')) {
            api.data.exists = false;
          } else {
            api.data.exists = true;
          }
          fulfill();

        });

      });
      
    });
    
    return api;

  };

  /*
   * Create local file and then rsync to container.
   */
  var init = function() {

    chain(function() {

    });

    return api;
    
  };

  /*
   * Compute the sha1 hash of api.filepath and store it in api.data.hash.
   */
  api.__hash = function() {
    
    return new Promise(function(fulfill, reject) {

      var cmd = 'kbox query ' + api.container +
        ' sha1sum ' + api.filepath;

      krun().run(cmd).ok().call(function(done) {

        if (_.contains(this.output, 'No such file or directory')) {
          api.data.hash = null;
        } else {
          api.data.hash = _.head(this.output.split(' '));
        }
        fulfill();

      });
        
    });

  };

  /*
   * Compute the sha1 hash of api.filepath and store it in api.data.hash.
   */
  api.hash = function() {

    chain(__hash);

    return api;

  };

  return api;

};

/*
 * Create and return a local file.
 */
var local = function(filepath) {

  // Object containing all methods returned by each call.
  var api = {
    filepath: filepath,
    data: {},
    __isLocal: true
  };

  /*
   * Add a promise to the end of the promise chain.
   */
  var chain = function(fn) {
    if (api.p) {
      api.p = api.p.then(fn);
    } else {
      api.p = Promise.resolve().then(fn);
    }
  };

  /*
   * Check if api.filepath exists, and save result to api.data.exists.
   */
  api.exists = function() {

    chain(function() {

      return new Promise(function(fulfill, reject) {

        fs.exists(api.filepath, function(exists) {
          api.data.exists = exists;
          fulfill();
        });

      });

    });

    return api;

  };

  /*
   * Create api.filepath and write random data to it.
   */
  api.init = function(cb) {

    api.exists();
    chain(function() {

      return new Promise(function(fulfill, reject) {

        if (api.data.exists) {
          return reject(new Error('File already exists: ' + api.filepath));    
        }

        var length = _.random(1024, 1024 * 64 * 10);
        var contents = randomstring.generate(length);

        console.log('api.filepath -> ' + api.filepath);
        fs.writeFile(api.filepath, contents, function(err) {
          if (err) {
            return reject(err);
          }
          fulfill();
        });

      });

    });

    return api;

  };

  /*
   * Open and write a random string to a random location in the file.
   */
  api.edit = function() {

    chain(function() {

      return new Promise(function(fulfill, reject) {

        fs.open(api.filepath, 'a+', function(err, fd) {

          if (err) {
            return reject(err);
          }

          fs.fstat(fd, function(err, stats) {

            if (err) {
              return reject(err);
            }

            var fileSize = stats.size;
            var pos = _.random(0, fileSize);
            var data = randomstring.generate(_.random(0, 64 * 128));

            fs.write(fd, data, pos, 'utf8', function(err, written, string) {

              if (err) {
                return reject(err);
              }

              fs.close(fd, function(err) {

                if (err) {
                  return reject(err);    
                }

                fulfill();

              });
              
            });
            
          });

        });
          
      });

    });

    return api;
    
  }

  /*
   * Compute the sha1 hash of api.filepath and store it in api.data.hash.
   */
  api.__hash = function() {

    return new Promise(function(fulfill, reject) {

      fs.readFile(api.filepath, function(err, data) {
        if (err) {
          return reject(err);
        }
        api.data.hash = sha1(data);
        fulfill();

      });

    });

  };

  /*
   * Compute the sha1 hash of api.filepath and store it in api.data.hash.
   */
  api.hash = function() {

    chain(__hash);

    return api;

  };

  /*
   * Unlink api.filepath.
   */
  api.remove = function() {

    //api.p = api.p.finally(function() {
    api.p = api.p.then(function() {

      return new Promise(function(fulfill, reject) {
        fs.unlink(api.filepath, function(err) {
          if(err) {
            return reject(err);
          }
          fulfill();
        });
      });

    });

    return api;

  };

  /*
   * Create a remote base on this file, and save to api.data.remote.
   */
  api.toRemote = function(container) {

    chain(function() {

      return new Promise(function(fulfill, reject) {

        var filename = path.basename(api.filepath);
        var filepath = path.join('/data', filename);
        api.data.remote = remote(container, filepath);
        fulfill();

      });

    });

    return api;

  };

  /*
   * Poll until local and remote files are equal, or until timeout occurs.
   */
  api.untilEqual = function(remote, timeout) {

    chain(function() {

      var cancel = false;

      return new Promise(function(fulfill, reject) {

        if (typeof remote === 'number' && !timeout) {
          timeout = remote;
          remote = api.data.remote;
        }

        var areEqual = false;

        var shouldStop = function() {
          console.log('areEqual -> ' + areEqual);
          return areEqual || cancel;
        };

        var fn = function(next) {

          Promise.all([api.__hash(), remote.__hash()])
          .then(function() {
            if (remote.data.hash && remote.data.hash === api.data.hash) {
              areEqual = true;
            }
          })
          .delay(2500)
          .then(next, next);
              
        };

        async.doUntil(fn, shouldStop, function(err) {
          if (err) {
            return reject(err);
          }
          fulfill();
        });
          
      })
      .timeout(timeout * 1000, 'untilEqual')
      .catch(Promise.TimeoutError, function(err) {
         cancel = true;
         throw err;
      });

    });

    return api;
    
  }

  /*
   * Call an external callback, inject api.data as this context. 
   */
  api.call = function(cb) {
    
    api.p = api.p.then(function() {

      return new Promise(function(fulfill, reject) {

        cb.call(api.data, function(err) {
          if (err) {
            return reject(err);
          }
          fulfill();
        });

      });

    });

    return api;

  };

  /*
   * End the promise chain and report errors.
   */
  api.done = function(cb) {
    
    api.p = api.p.then(cb, cb);

  };

  api.promise = function() {

    return api.p;

  };

  /*
   * Init the promise chain.
   */
  api.exists();
  api.p = api.p.then(function() {

    return new Promise(function(fulfill, reject) {

      if (api.data.exists) {

        fs.stat(api.filepath, function(err, stats) {
          if (err) {
            return reject(err);
          }
          if (stats.isDirectory()) {
            var filename = randomstring.generate(9) + '.txt';
            var filepath = path.join(api.filepath, filename);
            api.filepath = filepath;
          }
          fulfill();
        });

      } else {

        fulfill();

      }

    });

  });

  // Return api.
  return api;

};

module.exports = {
  local: local,
  remote: remote
};
