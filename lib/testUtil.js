'use strict';

exports.mockFs = {
  config: {
    'kalabox': {
      'apps': {
        'myapp54': {
          'kalabox.json': '{ "someSetting2": "5.34" }'
        }
      }
    },
    '.kalabox': {
      'kalabox.json': '{ "someSetting1": "green" }',
      'apps': {
        'myapp1': {
          'app.json': '{ "name": "myapp1", "status": "" }'
        },
        'myapp2': {
          'app.json': '{ "name": "myapp2", "status": "" }'
        },
        'myapp3': {
          'app.json': '{ "name": "myapp3", "status": "" }'
        },
        'myapp4': {
          'app.json': '{ "name": "myapp4", "status": "" }'
        },
        'myapp5': {
          'app.json': '{ "name": "myapp5", "status": "" }'
        }
      }
    }
  },
  create: function(opts) {
    var _config = opts ? opts : this.config;
    var mockFs = require('mock-fs');
    var _cwd = process.cwd();
    process.chdir(process.env.HOME);
    mockFs(_config);
    process.chdir(_cwd);
    return mockFs;
  }
};
