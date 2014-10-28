'use strict';

exports.mock_fs = {
  config: {
    '.kalabox': {
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
  create: function (opts) {
    var _config = opts ? opts : this.config;
    var mock_fs = require('mock-fs');
    var _cwd = process.cwd();
    process.chdir(process.env['HOME']);
    mock_fs(_config);
    process.chdir(_cwd);
    return mock_fs;
  }
};
