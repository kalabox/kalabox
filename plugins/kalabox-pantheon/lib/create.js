
'use strict';

module.exports = function(kbox, pantheon) {

  // Npm modulez
  var _ = require('lodash');

  // kbox modules
  var Promise = kbox.Promise;

  // List of viable frameworks
  var frameworks = [
    'drupal',
    'drupal8',
    'wordpress',
    'backdrop'
  ];

  // argv v for usage later
  var options = kbox.core.deps.get('argv').options;

  // We need this so we can later "validate" our password
  var loginEmail;

  /*
   * Parse our sites from terminus into a choices array
   */
  var parseSites = function(sites) {
    var choices = [];
    _.map(sites, function(val) {
      choices.push({
        name: val.information.name,
        value: val.information.name
      });
    });
    return _.sortBy(choices, 'name');
  };

  /*
   * Parse our envs from terminus into a choices array
   */
  var parseEnvironments = function(envs) {
    var choices = [];

    // @todo: Do we want to allow pull from test/live?
    delete envs.live;
    delete envs.test;

    _.map(envs, function(val, key) {
      choices.push({
        name: key,
        value: key
      });
    });

    return _.sortBy(choices, 'name');
  };

  // Choose a pantheon account to use or optionally auth with a
  // differnet account
  kbox.create.add('pantheon', {
    option: {
      name: 'email',
      weight: -99,
      task: {
        kind: 'string',
        description: 'Pantheon dashboard email.',
      },
      inquire: {
        type: 'list',
        message: 'Choose a Pantheon account.',
        // Grab a list of accounts to use plus an option to use a
        // new account
        choices: function() {

          // See if we have previously used accounts
          var sessions = pantheon.getSessionFiles();

          // Build choices array
          var choices = [];
          _.forEach(sessions, function(session) {
            var email = session.email;
            choices.push({name: email, value: email});
          });

          // Add option to add account
          choices.push({name: 'add a different account', value: 'more'});

          // Return choices
          return choices;

        },
        // Only run this prompt if we have logged in with a pantheon
        // account before.
        when: function() {
          // See if we have previously used accounts
          var sessions = pantheon.getSessionFiles();
          // This assumes all kalabox terminus sessions have an email property
          return (sessions);
        },
        filter: function(value) {
          loginEmail = value;
          return value;
        },
      }
    }
  });

  // Prompt for dashboard username if needed
  kbox.create.add('pantheon', {
    option: {
      name: 'email',
      weight: -98,
      inquire: {
        type: 'input',
        message: 'Pantheon dashboard email',
        validate: function(value) {
          loginEmail = value;
          return true;
        },
        // Only run this prompt if we havent logged in with a pantheon
        // account before.
        when: function(answers) {
          if (answers.email === undefined || answers.email === 'more') {
            return true;
          }
        }
      }
    }
  });

  // Prompt for password if needed
  // @todo: eventually remove this and have this handled inside getToken
  // we can only do this when we resolve the inquiry inception issue.
  kbox.create.add('pantheon', {
    option: {
      name: 'password',
      weight: -97,
      task: {
        kind: 'string',
        description: 'Pantheon dashboard password.',
      },
      inquire: {
        type: 'password',
        message: 'Pantheon dashboard password',
        validate: function(value) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // Login to the pantheon
          pantheon.auth(loginEmail, value)

          // Validate if we have a valid session
          .then(function(session) {
            done(pantheon.validateSession(session));
          });

        },
        when: function(answers) {

          // Store initial email from first question
          var email = options.email || answers.email;

          // Prompt for password if we have no stored session
          // or if user is entering a new account or we have no option
          if (email === undefined || email === 'more') {

            // And then prompt for a password
            return true;

          }

          // Also prompt for password if we are trying to use a preexisting
          // session and that session is no longer valid
          if (email) {
            var session = pantheon.getSessionFile(email);
            return !pantheon.validateSession(session);
          }

        }
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'site',
      weight: -90,
      task: {
        kind: 'string',
        description: 'Pantheon site machine name.',
      },
      inquire: {
        type: 'list',
        message: 'Which site?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // We may be in semi-interactive mode so we want to handle the situation
          // where we might not have logged in yet. this is ok because
          // if we authed already its trivial to grab the cached session
          var email = options.email || answers.email;
          var password = options.password || answers.password;

          // Do we need to login?
          return Promise.try(function() {
            return password !== undefined;
          })

          // Login to the pantheon if needed
          .then(function(needsLogin) {
            if (needsLogin) {
              return pantheon.auth(email, password);
            }
            else {
              return pantheon.setSession(pantheon.getSessionFile(email));
            }
          })

          // Grab a list of sites from pantheon, we presume if youve
          // gotten this far that you have a valid session and all is right in
          // the world
          .then(function() {
            return pantheon.getSites();
          })

          // Parse the list
          .then(function(sites) {
            // Check to see if we have a null framework so we can set it
            // correctly in the next optional step
            done(parseSites(sites));
          });

        }
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'env',
      weight: -85,
      task: {
        kind: 'string',
        description: 'Pantheon site environment.',
      },
      inquire: {
        type: 'list',
        message: 'Which environment?',
        choices: function(answers) {

          // Make this async cause we need to hit the terminus
          var done = this.async();

          // We may be in semi-interactive mode so we want to handle the situation
          // where we might not have logged in yet. this is ok because
          // if we authed already its trivial to grab the cached session
          var email = options.email || answers.email;
          var password = options.password || answers.password;
          var site = options.site || answers.site;

          // Do we need to login?
          return Promise.try(function() {
            return password !== undefined;
          })

          // Login to the pantheon if needed
          .then(function(needsLogin) {
            if (needsLogin) {
              return pantheon.auth(email, password);
            }
            else {
              return pantheon.setSession(pantheon.getSessionFile(email));
            }
          })

          // Grab our sites again so we can look for a correctly set framework
          .then(function() {
            return pantheon.getSites();
          })

          // Check to see whether we need to prompt the user for a framework
          // in the next step
          .then(function(sites) {
            // Get the UUID
            var uuid = _.findKey(sites, function(s) {
              return s.information.name === site;
            });
            // Set the framework
            var framework = sites[uuid].information.framework;
            answers.needsFramework = !_.include(frameworks, framework);
            // Pass the UUID on
            return uuid;
          })

          // Grab this sites environments, we presume if youve
          // gotten this far that you have a valid session and all is right in
          // the world
          .then(function(uuid) {
            return pantheon.getEnvironments(uuid);
          })

          // Parse and return the envs
          .then(function(envs) {
            done(parseEnvironments(envs));
          });

        }
      }
    }
  });

  // Add an option
  // todo: make this message better?
  var fMessage = 'This is quite unexpected! It looks like you do not have a ' +
    'framework associated with your site. Please contact Pantheon support to ' +
    'resolve this issue. In the meantime you can select your framework ' +
    ' manually';
  kbox.create.add('pantheon', {
    option: {
      name: 'framework',
      weight: -80,
      inquire: {
        type: 'list',
        message: fMessage,
        choices: function() {
          return frameworks;
        },
        when: function(answers) {
          return answers.needsFramework;
        }
      }
    }
  });

  // Add an option
  kbox.create.add('pantheon', {
    option: {
      name: 'name',
      weight: -75,
      task: {
        kind: 'string',
        description: 'The name of your app.',
      },
      inquire: {
        type: 'input',
        message: 'What will you call this monster you have created',
        validate: function(value) {
          // @todo: do we need a better error message?
          var domain = kbox.core.deps.get('globalConfig').domain;
          var kebabMe = kbox.util.domain.modKebabCase(value);
          return kbox.util.domain.validateDomain([kebabMe, domain].join('.'));
        },
        filter: function(value) {
          if (value) {
            return kbox.util.domain.modKebabCase(value);
          }
        },
        default: function(answers) {
          return options.site || answers.site;
        }
      },
      conf: {
        type: 'global'
      }
    }
  });

};
