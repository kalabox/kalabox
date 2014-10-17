'use strict';

var expect = require('chai').expect
  , ctn = require('../lib/container.js')
  ;

describe('Container.js', function () {

  describe('createOpts', function () {

   var expectedOpts = {
     Hostname: "myHostName",
      Image: "myImageName",
     name: "myCName",
     Dns: ["8.8.8.8", "8.8.4.4"],
     Env: ["APPNAME=myAppName", "APPDOMAIN=myAppDomain"]
   };

    it('Should return an expected options object', function () {
      var comp = {
        hostname: "myHostName",
        cname: "myCName",
        image: { name: "myImageName" },
       app: { appname: "myAppName", appdomain: "myAppDomain" }
      };
     var opts = ctn.createOpts(comp);
     expect(opts).to.deep.equal(expectedOpts);
    });

  });
});
