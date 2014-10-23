'use strict';

var cmp = require('../lib/component.js'),
  expect = require('chai').expect,
  sinon = require('sinon');

describe('component.js', function () {

  describe('#Constructor()', function () {
    
    var app_api = {
      appdomain: 'myappdomain',
      cidPath: 'foo',
      dataCname: 'data',
      hasData: true,
      prefix: 'myapp1'
    },
    key = 'db',
    cmp_api = {
      image: {
        build: false
      }
    };

    it('Should set the correct properties.', function() {

      var x = new cmp.Component(app_api, key, cmp_api);

      expect(x).to.have.property('key', 'db');
      expect(x).to.have.property('hostname', 'db.myappdomain');
      expect(x).to.have.property('url', 'http://db.myappdomain');
      expect(x).to.have.property('dataCname', 'data');
      expect(x).to.have.property('cname', 'kb_myapp1db');
      expect(x).to.have.property('cidfile').to.match(/.*\/foo\/db$/);
    });

  });

});
