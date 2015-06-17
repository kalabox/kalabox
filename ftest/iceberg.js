'use strict';

var Krun = require('./krun.js');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var randomstring = require('randomstring');
var sha1 = require('sha1');
var VError = require('verror');
var pp = require('util').inspect;

/*
 * Constructor, works with or without new operator.
 */
function Remote(containerName, filepath) {

  if (this instanceof Remote) {
    this.p = Promise.resolve();
    this.containerName = containerName;
    this.filepath = filepath;
    this.state = {
      exists: false,
      hash: false
    };
    this.__isRemote = true;
  } else {
    return new Remote(containerName, filepath);
  }

}

Remote.prototype.chain = function(fn) {

  var self = this;

  self.p = self.p.then(function() {
    return fn.call(self);  
  });

  return self;

};

Remote.prototype.exists = function() {
  
  return this.chain(function() {

    var self = this;

    var cmd = [
      'kbox',
      'query',
      self.containerName,
      'ls',
      '-l',
      self.filepath
    ];

    return Krun()
    .run(cmd)
    .ok()
    .promise()
    .then(function() {
      return true;
    })
    .catch(function(err) {
      if (_.contains(err.message, 'No such file or directory')) {
        self.state.hash = false;
      } else {
        self.state.hash = null;
        throw err;    
      }
    });

  });

};

Remote.prototype._hash = function() {
  
  var self = this;

  var cmd = [
    'kbox',
    'query',
    self.containerName,
    'sha1sum',
    self.filepath
  ];

  return Krun().run(cmd).then(function() {

    var exists = !_.contains(this.output, 'No such file or directory');

    if (!exists) {
      self.state.hash = null;
    } else {
      self.state.hash = _.head(this.output.split(' '));
    }
    
  })
  .promise();

};

Remote.prototype.hash = function() {
  
  return this.chain(function() {

    var self = this;

    self._hash();

  });

};

Remote.prototype.then = function(fn) {
 
  return this.chain(fn);

};

Remote.prototype.promise = function() {

  return this.p;

};

function Local(filepath) {

  if (this instanceof Local) {
    var self = this;
    this.filepath = filepath;
    this.state = {
      exists: false,
      hash: null
    };
    this.__isLocal = true;

    this.p = Promise.fromNode(function(cb) {
      fs.stat(self.filepath, cb);
    })
    .then(function(stats) {
      if (stats.isDirectory()) {
        var filename = randomstring.generate(9) + '.txt';
        self.filepath = path.join(self.filepath, filename);
      }
    });

  } else {
    return new Local(filepath);
  }

}

Local.prototype.chain = function(fn) {
  
  var self = this;

  self.p = self.p.then(function() {
    return fn.call(self);
  });

  return self;

};

Local.prototype.then = function(fn) {
  
  return this.chain(fn);

};

Local.prototype.exists = function() {
  
  return this.chain(function() {

    var self = this;

    return Promise.fromNode(function(cb) {
      fs.exists(self.filepath, function(exists) {
        self.state.exists = exists;
        cb();
      });
    });

  });

};

Local.prototype.init = function() {
  
  return this.chain(function() {

    var self = this;

    if (self.state.exists) {
      throw new Error('File already exists: ' + self.filepath);
    }

    var length = _.random(1024, 1024 * 64 * 10);
    var contents = randomstring.generate(length);

    return Promise.fromNode(function(cb) {
      fs.writeFile(self.filepath, contents, cb);
    });

  });

};

/*
 * Edit a random position and length of file.
 */
Local.prototype.edit = function() {
  
  return this.chain(function() {

    // Save for later.
    var self = this;

    // Get file descriptor.
    var fd = Promise.fromNode(function(cb) {
      fs.open(self.filepath, 'a+', cb);
    });

    // Get file stats.
    var stats = fd.then(function(fd) {
      return Promise.fromNode(function(cb) {
        fs.fstat(fd, cb);
      });
    });

    // Join file descriptor and stats.
    return Promise.join(fd, stats, function(fd, stats) {
      // Get random position and random data.
      var fileSize = stats.size;
      var pos = _.random(0, fileSize);
      var data = randomstring.generate(_.random(0, 64 * 256));
      // Update file with random data at random position.
      return Promise.fromNode(function(cb) {
        fs.write(fd, data, pos, 'utf8', cb);
      })
      // Close file.
      .then(function() {
        return Promise.fromNode(function(cb) {
          fs.close(fd, cb);
        });
      });
    });

  });

};

Local.prototype._hash = function() {

  var self = this;

  return Promise.fromNode(function(cb) {
    fs.readFile(self.filepath, cb);
  })
  .then(function(data) {
    self.state.hash = sha1(data);
  });

};

Local.prototype.hash = function() {

  return this.chain(function() {

    var self = this;

    return self._hash();

  });
  
};

Local.prototype.remove = function() {
  
  return this.chain(function() {

    var self = this;

    return Promise.fromNode(function(cb) {
      fs.unlink(self.filepath, cb);
    });

  });

};

Local.prototype.toRemote = function(containerName) {
  
  return this.chain(function() {

    var self = this;

    var filename = path.basename(self.filepath);
    var filepath = path.join('/code', filename);
    self.state.remote = Remote(containerName, filepath);

  });

};

Local.prototype.promise = function() {

  return this.p;

};

Local.prototype.call = function(fn) {
  
  return this.chain(fn);

};

Local.prototype.done = function(cb) {
  
  return this.p.nodeify(cb);

};

Local.prototype.untilEqual = function(remote, timeout) {

  return this.chain(function() {

    var self = this;

    if (!timeout && typeof remote === 'number') {
      timeout = remote;
      remote = self.state.remote;
    }

    timeout = timeout || 30;
    timeout = timeout * 1000;

    var cancel = false;

    var rec = function() {
      return Promise.all([self._hash(), remote._hash()])
      .then(function() {
        if (!cancel) {
          var debugInfo = {
            filepath: self.filepath,
            local: self.state.hash,
            remote: remote.state.hash
          };
          console.log(pp(debugInfo));
          if (self.state.hash && self.state.hash === remote.state.hash) {
            return true;
          } else {
            return Promise.delay(2000)
            .then(function() {
              return rec();
            });
          }
        }
      });
    };

    return rec()
    .timeout(timeout)
    .catch(Promise.TimeoutError, function(err) {
      cancel = true;
      throw new VError(err, 'Timeouted out after: "%s"', timeout);
    });

  });

};

module.exports = {
  Remote: Remote,
  Local: Local
};
