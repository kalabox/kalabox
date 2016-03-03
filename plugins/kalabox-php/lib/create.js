
'use strict';

module.exports = function(kbox, frameworks) {

  // Npm modulez
  var _ = require('lodash');

  // Add options for each framework
  _.forEach(frameworks, function(framework) {

    // Allow user to specify a name
    kbox.create.add(framework, {
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
            return options.site || answers.site || 'My App';
          }
        },
        conf: {
          type: 'global'
        }
      }
    });

  });

};
