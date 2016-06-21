'use strict';

var EC = protractor.ExpectedConditions;
var username = process.env.PANTHEON_USER;
var password = process.env.PANTHEON_PASSWORD;
var util = require('./sidebar.util.js');

describe('sidebar module tests', function() {

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

  beforeEach(function(done) {
    return browser.sleep(1 * 1000)
    .then(function() {
      return util.closeSidebar();
    })
    .then(function() {
      return browser.sleep(1 * 1000);
    })
    .then(done);
  });

  it('allow Pantheon sign-in', function() {
    var addPantheon = $('ul.providers-next a', 'Pantheon');
    var addPantheonClickable = EC.elementToBeClickable(addPantheon);
    return util.openSidebar()
    .then(function() {
      return browser.wait(addPantheonClickable);
    })
    .then(function() {
      return addPantheon.click();
    })
    .then(function() {
      var authPage = $('div.pantheon-authorization');
      var authPageLoaded = EC.presenceOf(authPage);
      return browser.wait(authPageLoaded);
    })
    .then(function() {
      return expect($('h4').getText()).toBe('AUTHENTICATE WITH PANTHEON');
    })
    .then(function() {
      $('input#authEmail').sendKeys(username);
      // Need to figure out secret key sending.
      $('input#authPassword').sendKeys(password);
      return $('button.btn-primary').click();
    })
    .then(function() {
      var loaderPresent = EC.presenceOf($('div.loader'));
      return browser.wait(loaderPresent);
    })
    .then(function() {
      return expect($('.loader h4').getText())
      .toBe('AUTHENTICATING');
    })
    .then(function() {
      var backToSidebar = EC.presenceOf($('h4.add-account'));
      return browser.wait(backToSidebar);
    });
  });

  it('show sites associated with PANTHEON_USER', function() {
    return util.getToUserPantheonSites().then(function() {
      return browser.sleep(5 * 1000)
      .then(function() {
        // @todo: May want to verify specific sites show up.
        return element.all(by.css('ul.provider-sites .new-site'))
        .getText().then(function(providerSites) {
          return expect(providerSites.length).toBeGreaterThan(3);
        });
      });
    });
  });

  it('dont allow a blank Pantheon sitename', function() {
    // Click on the kalabox-drupal8.
    var opts = {
      pantheonSiteName: 'kalabox-drupal8'
    };
    return util.createPantheonSiteForm(opts)
    .then(function() {
      return browser.sleep(2 * 1000);
    })
    .then(function() {
      // Try submitting the form blank.
      // Get site name input.
      var sitenameInput = $('#appName');
      // Clear the site name input.
      sitenameInput.clear();
      // Make sure site name input is set to empty string.
      expect(sitenameInput.getAttribute('value')).toEqual('');
      // Set env to dev.
      element(by.cssContainingText('#appEnv option', 'dev')).click();
      // Make sure env is set to dev.
      expect($('#appEnv').getAttribute('value')).toEqual('dev');
      // Make sure submit is not clickable
      var submit = element(by.buttonText('Submit'));
      return expect(EC.not(EC.elementToBeClickable(submit)));
    });
  });

  it('can pull down a pantheon site', function() {
    var opts = {
      siteName: 'testpantheonsite',
      siteEnv: 'dev',
      pantheonSiteName: 'kalabox-drupal8'
    };
    return util.createPantheonSiteWait(opts);
  });

  it('can remove a site', function() {
    var siteName = 'testpantheonsite';
    return util.removeSite(siteName)
    .then(function() {
      return util.waitOnSiteAction(siteName);
    })
    .then(function() {
      var site = util.findSite(siteName);
      expect(site.isPresent()).toEqual(false);
    });
  });

  it('can pull down sites in parallel', function() {
    var sites = [
      {
        siteName: 'unicornsite1',
        siteEnv: 'dev',
        pantheonSiteName: 'kalabox-drupal8'
      },
      {
        siteName: 'unicornsite2',
        siteEnv: 'dev',
        pantheonSiteName: 'kalabox-drupal8'
      }
    ];
    return util.createPantheonSite(sites[0])
    .then(function() {
      return browser.sleep(2 * 1000);
    })
    .then(function() {
      return util.createPantheonSite(sites[1]);
    })
    .then(function() {
      return util.waitOnSiteAction(sites[0].siteName);
    })
    .then(function() {
      return util.waitOnSiteAction(sites[1].siteName);
    })
    .then(function() {
      return util.ensureSiteExists(sites[0].siteName);
    })
    .then(function() {
      return util.ensureSiteExists(sites[1].siteName);
    });
  });

  it('throw error on trying to use a taken app name', function() {
    var site = {
      siteName: 'unicornsite1',
      siteEnv: 'dev',
      pantheonSiteName: 'kalabox-drupal8'
    };

      // Try pulling same site with same name.
    util.createPantheonSite(site).then(function() {
      // Should receive a validation error.
      var errorPresent = EC.presenceOf($('.app-create-pantheon .alert-danger'));
      return browser.wait(errorPresent);
    });
  });

  it('app has connection info', function() {
    var siteName = 'unicornsite1';

    // Open connection modal.
    return util.getSite(siteName)
    .then(function(site) {
      return site.element(by.css('.site-actions-dropdown')).click()
      .then(function() {
        return browser.sleep(20 * 1000);
      })
      .then(function() {
        return site.element(by.css('a.site-connection')).click();
      })
      .then(function() {
        return browser.sleep(5 * 1000);
      })
      .then(function() {
        var databaseFields = element.all(by.css('.service.database input'));
        expect(databaseFields.count()).toBeGreaterThan(0);
      });
    });
  });
});
