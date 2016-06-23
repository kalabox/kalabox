'use strict';

var EC = protractor.ExpectedConditions;

describe('dashboard module tests', function() {
  beforeEach(function() {
    console.log('hello party people');
    var url = browser.get('dashboard');
    console.log(url);
    //browser.get(browser.baseUrl + '#/dashboard', 5000);
    browser.ignoreSynchronization = true;
    browser.sleep(20 * 1000);
    browser.get(url);
  });
  beforeAll(function(done) {
    browser.ignoreSynchronization = true;
    return browser.sleep(15 * 1000)
    .then(function() {
      return browser.get(browser.baseUrl + '#/initialize');
    })
    .then(function() {
      var addSite = $('div.site.add a');
      return browser.wait(EC.presenceOf(addSite));
    })
    .then(function() {
      done();
    });
  });
  afterEach(function() {
  });
  it('should link to the sidebar from add site button', function() {
    var addSite = $('div.site.add a');
    addSite.click().then(function() {
      var provider = $('h4');
      expect(provider.getText()).toEqual('ADD ACCOUNT');
    });
  });
  it('should have an add site button', function() {
    var message = $('div.site.add h3');
    var isClickable = EC.presenceOf(message);
    browser.wait(isClickable).then(function() {
      expect(message.getText()).toEqual('Add new site');
    });
  });

});
