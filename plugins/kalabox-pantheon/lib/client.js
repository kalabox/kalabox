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
  this.cacheDir = path.join(homeDir, '.kalabox', 'terminus', 'session');
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
  this.keySet = false;

}

/*
 * Set the session
 */
Client.prototype.setSession = function(session) {

  // @todo: how do we validate?
  // @todo: only write file if its changed? md5 hash compare?

  // Make sure we are translating expire correctly
  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  var expires;
  if (session.session_expire_time) {
    expires = session.session_expire_time;
  }
  else {
    expires = session.expires_at;
  }

  // Make sure we are translating uid correctly
  var uid;
  if (session.user_uuid) {
    uid = session.user_uuid;
  }
  else {
    uid = session.user_id;
  }

  // Set our runtime cache
  this.session = {
    session: session.session,
    session_expire_time: expires,
    user_uuid: uid,
    email: session.email,
    name: session.name
  };
  // jshint camelcase:true
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  // Save a cache locally so we can share among terminus clients
  fs.mkdirpSync(this.cacheDir);
  var sessionFile = path.join(this.cacheDir, this.session.email);
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
      var data = fs.readFileSync(sessionFile, 'utf8');
      var session = JSON.parse(data);
      sessions.push(session);
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

  var sessions = this.getSessionFiles();

  var session = _.find(sessions, function(sess) {
    return sess.email === email;
  });

  return session;

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

  // Kill session if it doesn't have the full name on it so we can reauth
  // and get this important data
  if (session && session.name === undefined) {
    return false;
  }

  // Session is lookin MIGHTY FINE! MIGHTY FINE INDEED!
  return true;

};

/*
 * Returns the session if it exists and is valid
 */
Client.prototype.getSession = function(email) {

  // If no email try to load from app conf
  // @todo: if no email then load all the sessions we have saved
  if (!email && this.app) {
    var config = this.__getOpts();
    email = config.account;
  }

  // Get this instance's cached session.
  var session = this.session || this.getSessionFile(email);

  // If we have a valid session we return it
  if (this.validateSession(session)) {
    return session;
  }

  // At least return the email and name even if we are invalid
  else {
    if (session && session.email && session.name) {
      return {
        email: session.email,
        name: session.name
      };
    }
    else {
      return undefined;
    }
  }
};

/*
 * Returns true if we need to reauth
 */
Client.prototype.needsReauth = function(session) {

  var reUp = (session && session.session === undefined);
  this.kbox.core.log.debug('SESSION VALID => ' + !reUp);
  return reUp;

};

/*
 * If our session is not valid lets try to get a new one
 */
Client.prototype.reAuthSession = function() {

  // Summon the inquisitor
  var inquirer = require('inquirer');

  // We need ourselves present when we make promises
  var self = this;

  var session = this.getSession();

  // Prompt question
  var questions = [
    {
      name: 'password',
      type: 'password',
      message: 'Pantheon dashboard password (' + session.email + ')'
    }
  ];

  /*
   * Helper method to promisify inquiries
   */
  var askIt = function(questions, session) {
    if (self.needsReauth(session)) {
      return new self.Promise(function(answers) {
        console.log('Your Pantheon session has expired. We need to reauth!');
        inquirer.prompt(questions, answers);
      });
    }
    else {
      return self.Promise.resolve(false);
    }
  };

  // Run the prompt and return the password
  return askIt(questions, session)

  // Get my answers
  .then(function(answers) {

    // Get the email
    if (answers !== false) {

      // Grab the session again
      // @todo: what happens if we can't do this?
      var session = self.getSession();

      // Login
      return self.auth(session.email, answers.password);
    }

  });

};

/*
 * Build headers with our pantheon session so we can do
 * protected stuff
 */
Client.prototype.__getSessionHeaders = function(session) {

  // Reutrn the header object
  return {
    'Content-Type': 'application/json',
    'Cookie': 'X-Pantheon-Session=' + session.session
  };

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

  // GEt rest mod
  var rest = require('restler');

  // Need this for all the promises we will make
  var self = this;

  // Skip this part for an authorize request since we may
  // not have a session yet and dont need auth headers anyway
  if (!_.includes(pathname, 'authorize')) {

    // Grab a session to set up our auth
    var session = this.getSession();

    // Prompt the user to reauth if the session is invalid
    if (this.needsReauth(session)) {

      // Reuath attempt
      return this.reAuthSession()

      // Set our session to be the new session
      .then(function(reAuthSession) {
        session = reAuthSession;
      });

    }

    // Build our header and merge it into any other
    // data we might be sending along
    var headers = this.__getSessionHeaders(session);
    data = _.merge(data, {headers: headers});

  }

  // Format our URL
  return self.Promise.try(function() {

    // Build the URL object
    var obj = _.extend(self.target, {pathname: self.__url(pathname)});

    // Format to url string and return
    return urls.format(obj);

  })

  // Make the Request and handle the result
  // @todo: clean this code up
  .then(function(url) {

    return self.Promise.retry(function() {
      // Send REST request.
      return new self.Promise(function(fulfill, reject) {
        rest[verb](url, data)
        .on('success', fulfill)
        .on('fail', function(data) {
          var err = new Error(data);
          reject(err);
        })
        .on('error', reject);
      });
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
  return self.__request('postJson', ['authorize'], data)

  // Validate response and return ID.
  .then(function(response) {

    // Set the email and placeholder name
    response.email = email;
    response.name = '';

    // Set the session once here so we can run the profile disco request
    self.session = self.setSession(response);

    // Set the fullname
    return self.getProfile()
      .then(function(profile) {
        // jshint camelcase:false
        // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
        self.session.name = profile.full_name;
        // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
        // jshint camelcase:true
      })
      .then(function() {
        // Set session again with additional info
        // @todo: this might be redundant
        self.session = self.setSession(self.session);
        return self.session;
      });

  });

};

/*
 * Get full list of sites
 *
 * sites/USERID/sites
 */
Client.prototype.getSites = function() {

  // Just grab the cached sites if we already have
  // made a request this process
  if (this.sites !== undefined) {
    return this.Promise.resolve(this.sites);
  }

  // Some things to use later
  var self = this;

  // Get the session for user info
  var session = this.getSession();

  // Make the request
  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  return this.__request('get', ['users', session.user_uuid, 'sites'], {})
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers
  // jshint camelcase:true

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
Client.prototype.getEnvironments = function(sid) {

  // Make request
  return this.__request('get', ['sites', sid, 'environments'], {})

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
Client.prototype.getProfile = function() {

  // Get the session for user info
  var session = this.getSession();

  // Send REST request.
  // jshint camelcase:false
  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  return this.__request('get', ['users', session.user_uuid, 'profile'], {})
  // jscs:emable requireCamelCaseOrUpperCaseIdentifiers
  // jshint camelcase:true

  // Return the profile
  .then(function(profile) {
    return profile;
  });

};

// Return constructor as the module object.
module.exports = Client;
