
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

  /*
   * Helper to return valid cached sessions
   */
  var getValidSessions = function() {
    return _.without(_.map(pantheon.getSessionFiles(), function(session) {
      if (pantheon.validateSession(pantheon.getSession(session))) {
        return {name: session, value: session};
      }
    }), undefined);
  };

  /*
   * Helper to determine whether we need an email or not
   */
  var needsEmail = function() {
    var options = kbox.core.deps.get('argv').options;
    return (pantheon.getSession() === undefined && !options.email);
  };

  /*
   * Helper to determine whether we need a password or not
   */
  var needsPassword = function() {
    var options = kbox.core.deps.get('argv').options;
    return (pantheon.getSession() === undefined && !options.password);
  };

  /*
   * Helper to set the session correctly
   */
  var validateSession = function(answers) {
    // We may be in semi-interactive mode so we want to handle the situation
    // where we might not have logged in yet. this is ok because
    // if we authed already its trivial to grab the cached session
    var options = kbox.core.deps.get('argv').options;
    var email = options.email || answers.email;
    var password = options.password || answers.password;
    // Login to the pantheon if needed
    return Promise.try(function() {
      if (pantheon.getSession() === undefined) {
        return pantheon.auth(email, password);
      }
    });
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

          // Get previously valid sessions
          var choices = getValidSessions();

          // Add option to add account
          choices.push({name: 'add a different account', value: 'more'});

          // Return choices
          return choices;

        },
        // If we have a session we should set it here
        filter: function(input) {
          if (input !== 'more' && pantheon.getSessionFile(input)) {
            pantheon.setSession(input, pantheon.getSessionFile(input));
          }
          return input;
        },
        // Only run this prompt if we have logged in with a pantheon
        // account before.
        when: function() {
          // Run if we have valid sessions
          return (!_.isEmpty(getValidSessions()));
        }
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
        // Only run this prompt if we don't have a session set yet or
        // we have passed in the email as an option
        when: function(/*answers*/) {
          return needsEmail();
        }
      }
    }
  });

  // Prompt for password if needed
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
        when: function(/*answers*/) {
          return needsPassword();
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

          // Validate our session
          return validateSession(answers)

          // Grab a list of sites from pantheon
          .then(function() {
            return pantheon.getSites();
          })

          // Parse the list
          .then(function(sites) {
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

          // Validate our session
          return validateSession(answers)

          // Grab our sites again so we can look for a correctly set framework
          .then(function() {
            return pantheon.getSites();
          })

          // Check to see whether we need to prompt the user for a framework
          // in the next step
          .then(function(sites) {
            // Our site is either an answer or option
            var options = kbox.core.deps.get('argv').options;
            var site = options.site || answers.site;
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
  // @todo: make this message better?
  // @todo: do we need this still?
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
          var options = kbox.core.deps.get('argv').options;
          return options.site || answers.site;
        }
      },
      conf: {
        type: 'global'
      }
    }
  });

};
