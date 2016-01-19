'use strict';

/**
 * Module for interacting with the pantheon api directly from node
 * @module client.js
 */

// Node modules.
var fs = require('fs-extra');
var path = require('path');
var urls = require('url');
var _ = require('lodash');

/*
 * Constructor.
 */
function Client(kbox) {

  // Load in our kbox object and some relevant things
  this.kbox = kbox;
  this.Promise = kbox.Promise;

  var globalConfig = this.kbox.core.deps.lookup('globalConfig');
  var homeDir = globalConfig.home;
  this.cacheDir = path.join(homeDir, '.kalabox', 'pantheon', 'session');
  if (!fs.existsSync(this.cacheDir)) {
    fs.mkdirpSync(this.cacheDir);
  }

  // Pantheon endpoint
  this.target = {
    protocol: 'https',
    hostname: 'dashboard.getpantheon.com',
    port: '443'
  };

  // Das Kindacache
  this.session = undefined;
  this.sites = undefined;

}

/*
 * Set the session
 */
Client.prototype.setSession = function(email, session) {

  // Make sure we are translating expire correctly
  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  // Set our runtime cache
  this.session = {
    session: session.session,
    session_expire_time: session.session_expire_time || session.expires_at,
    user_uuid: session.user_uuid || session.user_id
  };
  // jshint camelcase:true
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  // Save a cache locally so we can share among terminus clients
  fs.mkdirpSync(this.cacheDir);
  var sessionFile = path.join(this.cacheDir, email);
  var writableSession = JSON.stringify(this.session);
  fs.writeFileSync(sessionFile, writableSession);

  return this.session;

};

/*
 * Helper function for reading file cache.
 */
Client.prototype.getSessionFiles = function() {

  var self = this;
  var files = fs.readdirSync(this.cacheDir);
  var sessions = [];

  // Try to load all our session files
  _.forEach(files, function(filename) {
    // Try to read in each file
    try {
      // Read in the file
      var sessionFile = path.join(self.cacheDir, filename);
      fs.readFileSync(sessionFile, 'utf8');
      sessions.push(filename);
    }
    catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  });

  // If file cache was loaded, parse the contents and set the session.
  if (!_.isEmpty(sessions)) {
    return sessions;
  } else {
    return undefined;
  }

};

/*
 * Helper function for reading specific file cache.
 */
Client.prototype.getSessionFile = function(email) {

  // Cleary we dont have it
  if (!email) {
    return undefined;
  }

  // The directory in which our sessions live
  var sessionFile = path.join(this.cacheDir, email);
  var data = fs.readFileSync(sessionFile, 'utf8');
  return (JSON.parse(data));

};

/*
 * Make sure our session is still 100% 2legit2quit
 */
Client.prototype.validateSession = function(session) {

  // Session is false, session is tricksy if it is undefined
  if (session === undefined) {
    return false;
  }

  /*
   * Session is illegitimate if its expired
   *
   * Date.now uses miliseconds, while session_expire_time seems to use
   * seconds, so converting them to match is needed. So here I'm just
   * multiplying session_expire_time by 1000 to be in miliseconds.
   */
  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  if (session && Date.now() > (session.session_expire_time * 1000)) {
    return false;
  }
  // jshint camelcase:true
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  // Session is lookin MIGHTY FINE! MIGHTY FINE INDEED!
  return true;

};

/*
 * Returns the session if it exists and is valid
 */
Client.prototype.getSession = function(email) {

  // Get this instance's cached session.
  var session = this.session || this.getSessionFile(email);

  // If we have a valid session we return it
  if (this.validateSession(session)) {
    return session;
  }

  // Otherwise return undefined
  return undefined;

};

/*
 * Returns a session property
 */
Client.prototype.getSessionProp = function(prop, email) {

  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  switch (prop) {
    case 'session': return this.getSession(email).session;
    case 'expires': return this.getSession(email).session_expire_time;
    case 'user': return this.getSession(email).user_uuid;
    case 'email': return this.getSession(email).email;
    case 'name': return this.getSession(email).name;
  }
  // jshint camelcase:true
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

};

/*
 * Return auth headers
 */
Client.prototype.__getAuthHeaders = function(session) {
  return {
    'Content-Type': 'application/json',
    'Cookie': 'X-Pantheon-Session=' + session
  };
};

/*
 * Return a default data object
 */
Client.prototype.__getRequestData = function(data) {

  // Make sure data is at least an empty object
  data = (data !== undefined) ? data : {};

  // Merge in session data if we have it
  if (this.getSession()) {
    var session = this.getSession();
    data = _.merge(data, {headers: this.__getAuthHeaders(session.session)});
  }

  // Return our data
  return data;

};

/*
 * Construct a new URL, possibly a lightsaber as well
 */
Client.prototype.__url = function(parts) {
  parts.unshift('api');
  return parts.join('/');
};

/*
 * Send and handle a REST request.
 * @todo: make this less ugly
 */
Client.prototype.__request = function(verb, pathname, data) {

  // Log our requests
  var log = this.kbox.core.log.make('PANTHEON API');
  log.debug(verb);
  log.debug(pathname);
  log.debug(data);

  // GEt rest mod
  var rest = require('restler');

  // Need this for all the promises we will make
  var self = this;

  // Build the URL object
  var obj = _.extend(this.target, {pathname: self.__url(pathname)});

  // Attempt the request
  return this.Promise.retry(function() {
    // Send REST request.
    return new self.Promise(function(fulfill, reject) {
      rest[verb](urls.format(obj), data)
      .on('success', fulfill)
      .on('fail', function(data) {
        var err = new Error(data);
        reject(err);
      })
      .on('error', reject);
    });
  });

};

/*
 * Auth with pantheon
 */
Client.prototype.auth = function(email, password) {

  // Check static cache
  if (this.session !== undefined) {
    return this.Promise.resolve(this.session);
  }

  // Save this for later
  var self = this;

  // @todo: validate email and password?
  // Set our stuff
  var data = {
    email: email,
    password: password
  };

  // Send REST request.
  return this.__request('postJson', ['authorize'], data)

  // Validate response and return ID.
  .then(function(response) {
    return self.setSession(email, response);
  });

};

/*
 * Get full list of sites
 *
 * sites/USERID/sites
 */
Client.prototype.getSites = function(userId, data) {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.sites !== undefined) {
    return this.Promise.resolve(this.sites);
  }

  // Some things to use later
  var self = this;

  // Use cached user if we have one
  var user = userId || this.getSessionProp('user');

  // Make the request
  return this.__request(
    'get',
    ['users', user, 'sites'],
    this.__getRequestData(data)
  )

  // Return sites
  .then(function(sites) {
    self.sites = sites;
    return sites;
  });

};

/*
 * Get full list of environments
 *
 * sites/SITEID/environments/
 */
Client.prototype.getEnvironments = function(sid, data) {

  // Make request
  return this.__request(
    'get',
    ['sites', sid, 'environments'],
    this.__getRequestData(data)
  )

  // Return object of envs
  .then(function(envs) {
    return envs;
  });

};

/*
 * Get users profile
 *
 * GET /users/USERID/profile
 *
 */
Client.prototype.getProfile = function(userId, data) {

  // Use cached user if we have one
  var user = userId || this.getSessionProp('user');

  // Send REST request.
  return this.__request(
    'get',
    ['users', user, 'profile'],
    this.__getRequestData(data)
  )

  // Return the profile
  .then(function(profile) {
    return profile;
  });

};

/*
 * Get users ssh keys
 *
 * GET /users/USERID/keys
 *
 */
Client.prototype.__getSSHKeys = function(userId, data) {

  // Use cached user if we have one
  var user = userId || this.getSessionProp('user');

  // Send REST request.
  return this.__request(
    'get',
    ['users', user, 'keys'],
    this.__getRequestData(data)
  )

  // Return keys
  .then(function(keys) {
    return keys;
  });

};

/*
 * Post users ssh keys
 *
 * POST /users/USERID/keys
 *
 */
Client.prototype.__postSSHKey = function(userId, sshKey) {

  // Argument handling
  if (sshKey === undefined) {
    sshKey = userId;
    userId = undefined;
  }

  // Use cached user if we have one
  var user = userId || this.getSessionProp('user');

  // Send in our ssh key with validation on
  var data = {
    data: JSON.stringify(sshKey),
    query: {
      validate: true
    }
  };

  // Send REST request.
  return this.__request(
    'post',
    ['users', user, 'keys'],
    this.__getRequestData(data)
  )

  // Return keys
  .then(function(keys) {
    return keys;
  });

};

/*
 * Set up our SSH keys if needed
 *
 * We only needs to check for this if we are going to run something in either
 * the terminus/git/rsync containers
 */
Client.prototype.sshKeySetup = function() {

  // Node modules
  var fingerprint = require('ssh-fingerprint');
  var keygen = require('ssh-keygen');

  // for later
  var self = this;

  // Get our global config
  var home = this.kbox.core.deps.get('globalConfig').home;

  // "CONSTANTS"
  var SSH_DIR = path.join(home, '.ssh');
  var PRIVATE_KEY_PATH = path.join(SSH_DIR, 'pantheon.kalabox.id_rsa');
  var PUBLIC_KEY_PATH = path.join(SSH_DIR, 'pantheon.kalabox.id_rsa.pub');

  // Make sure SSHDIR exists
  if (!fs.existsSync(SSH_DIR)) {
    fs.mkdirpSync(SSH_DIR);
  }

  /*
   * Load our pantheon public key and return it and a non-coloned
   * fingerprint
   */
  var loadPubKey = function() {
    var data = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');
    return {
      data: data,
      print: fingerprint(data).replace(/:/g, '')
    };
  };

  /*
   * Helper method to promisigy fs.exists
   */
  var existsAsync = function(path) {
    return new self.Promise(function(exists) {
      fs.exists(path, exists);
    });
  };

  // Check to see if we have both keys
  return self.Promise.join(
    existsAsync(PRIVATE_KEY_PATH),
    existsAsync(PUBLIC_KEY_PATH),
    function(privateExists, publicExists) {
      return privateExists && publicExists;
    }
  )

  // Generate a new SSH key if needed
  .then(function(exists) {
    if (!exists) {

      // Set Path environmental variable if we are on windows.
      // We need this because ssh-keygen is not in the path by default
      if (process.platform === 'win32') {

        // Add the correct gitbin
        // This can be in different spots for different windows versions so
        // we add the ones that exist
        var home = self.kbox.core.deps.get('globalConfig').home;
        var gBin1 = 'C:\\Program Files (x86)\\Git\\bin';
        var gBin2 = path.join(home, 'AppData\\Local', 'Programs', 'Git', 'bin');

        // Only add the gitbin to the path if the path doesn't start with
        // it. We want to make sure gitBin is first so other things like
        // putty don't F with it.
        // See https://github.com/kalabox/kalabox/issues/342
        _.forEach([gBin1, gBin2], function(bin) {
          var env = self.kbox.core.env;
          if (fs.existsSync(bin) && !_.startsWith(process.env.path, bin)) {
            env.setEnv('Path', [bin, process.env.Path].join(';'));
          }
        });
      }

      // Build our key option array
      // @todo: add session email for comment
      var pw = (process.platform === 'win32' ? '\'\'' : '');
      var keyOpts = {
        location: PRIVATE_KEY_PATH,
        comment: 'me@kalabox',
        password: pw,
        read: false,
        destroy: false
      };

      // Generate our key if needed
      return self.Promise.fromNode(function(callback) {
        keygen(keyOpts, callback);
      });
    }
  })

  // Look to see if pantheon has our pubkey
  .then(function() {

    // Grab our public key
    var pubKey = loadPubKey();

    // Grab public key fingerprints from pantheon
    return self.__getSSHKeys()

    // IF THE GLOVE FITS! YOU MUST ACQUIT!
    .then(function(keys) {
      return _.has(keys, pubKey.print);
    })

    // Post a key to pantheon if needed
    .then(function(hasKey) {
      if (!hasKey) {
        return self.__postSSHKey(pubKey.data);
      }
    });

  });

};

// Return constructor as the module object.
module.exports = Client;
