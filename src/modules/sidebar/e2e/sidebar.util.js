'use strict';

var EC = protractor.ExpectedConditions;
var username = process.env.PANTHEON_USER;

function closeSidebar() {
  var sidebar = element.all(by.css('#addSite')).first();
  return sidebar.isDisplayed().then(function(sidebarIsDisplayed) {
    if (sidebarIsDisplayed) {
      var closeSidebarX = $('.fa-times');
      var isClickable = EC.elementToBeClickable(closeSidebarX);
      return browser.wait(isClickable, 10 * 1000).then(function() {
        return browser.sleep(1 * 1000)
        .then(function() {
          return closeSidebarX.click();
        });
      });
    }
  });
}

function openSidebar() {
  return closeSidebar()
  .then(function() {
    return browser.sleep(1 * 1000);
  })
  .then(function() {
    var sidebar = element.all(by.css('#addSite')).first();
    return sidebar.isDisplayed().then(function(sidebarIsDisplayed) {
      if (!sidebarIsDisplayed) {
        var addSite = $('div.site.add a');
        var isClickable = EC.elementToBeClickable(addSite);
        return browser.wait(isClickable, 10 * 1000).then(function() {
          return browser.sleep(1 * 1000).then(function() {
            return addSite.click();
          });
        });
      }
    });
  });
}

function findSite(siteName) {
  var newSiteH3 = element(by.cssContainingText('.site-name', siteName));
  return newSiteH3.element(by.xpath('..'));
}

function waitOnSiteAction(siteName) {

  return browser.sleep(5 * 1000)
  .then(function() {
    var site = findSite(siteName);
    expect(site.isPresent()).toEqual(true);
    // Wait until done creating.
    var busySite = element(by.cssContainingText(
      '.site-wrapper.overlay-active',
      siteName
    ));
    var noBusySite = EC.not(EC.presenceOf(busySite));
    return browser.wait(noBusySite)
    .then(function() {
      return browser.sleep(3 * 1000);
    })
    .then(function() {
      return browser.wait(noBusySite);
    });
  });

}

function getToUserPantheonSites() {
   // Click on PANTHEON_USER's account.
  var account = element(by.cssContainingText('.provider-name', username));

  function doit() {
    var accountClickable = EC.elementToBeClickable(account);
    return browser.wait(accountClickable).then(function() {
      return browser.sleep(1 * 1000)
      .then(function() {
        return account.click();
      });
    }).then(function() {
      // Wait for sites to load.
      var sitesLoaded = EC.presenceOf($('ul.provider-sites'));
      return browser.wait(sitesLoaded);
    });
  }

  return openSidebar()
  .then(function() {
    var newSiteList = $('ul.provider-sites');
    return newSiteList.isPresent().then(function(isPresent) {
      if (!isPresent) {
        return doit();
      } else {
        return newSiteList.isDisplayed().then(function(isDisplayed) {
          if (!isDisplayed) {
            return doit();
          }
        });
      }
    });
  });

}

function createPantheonSiteForm(opts) {
  return getToUserPantheonSites().then(function() {
    return browser.sleep(2 * 1000)
    .then(function() {
      return element(by.cssContainingText('.new-site', opts.pantheonSiteName))
      .click();
    });
  })
  .then(function() {
    // Wait for the form.
    var siteAddFormPresent = EC.presenceOf($('div.app-create-pantheon'));
    return browser.wait(siteAddFormPresent);
  });
}

function createPantheonSite(opts) {
  return createPantheonSiteForm(opts)
  .then(function() {
    var sitenameInput = $('#appName');
    var envDropdown = $('#appEnv');
    var submitButton = element(by.buttonText('Submit'));
    return sitenameInput.clear()
    .then(function() {
      return sitenameInput.sendKeys(opts.siteName);
    })
    .then(function() {
      return envDropdown.element(by.cssContainingText('option', opts.siteEnv))
      .click();
    })
    .then(function() {
      return browser.sleep(1 * 1000);
    })
    .then(function() {
      return submitButton.click();
    });
  });
}

function getSite(siteName) {
  return browser.sleep(1 * 1000)
  .then(function() {
    var newSiteH3 = element(by.cssContainingText('.site-name', siteName));
    return newSiteH3.element(by.xpath('..'));
  });
}

function siteExists(siteName) {
  return getSite(siteName)
  .then(function(site) {
    if (site) {
      return site.isPresent();
    } else {
      return false;
    }
  });
}

function ensureSiteExists(siteName) {
  return getSite(siteName)
  .then(function() {
    return expect(siteExists(siteName)).toEqual(true);
  });
}

function createPantheonSiteWait(opts) {
  return createPantheonSite(opts)
  .then(function() {
    return browser.sleep(2 * 1000);
  })
  .then(function() {
    return waitOnSiteAction(opts.siteName);
  })
  .then(function() {
    return ensureSiteExists(opts.siteName);
  });
}

function removeSite(siteName) {
  return getSite(siteName)
  .then(function(site) {
    return site.element(by.css('.site-actions-dropdown')).click()
    .then(function() {
      return browser.sleep(1 * 1000);
    })
    .then(function() {
      return site.element(by.css('.fa-trash-o')).click();
    })
    .then(function() {
      return browser.sleep(5 * 1000);
    })
    .then(function() {
      var input = $('#appNameRemove');
      return input.click()
      .then(function() {
        return input.sendKeys(siteName);
      });
    })
    .then(function() {
      return browser.sleep(2 * 1000);
    })
    .then(function() {
      return element(by.cssContainingText('.btn-primary', 'Remove')).click();
    })
    .then(function() {
      return browser.sleep(3 * 1000);
    });
  });
}

module.exports = {
  findSite: findSite,
  openSidebar: openSidebar,
  closeSidebar: closeSidebar,
  waitOnSiteAction: waitOnSiteAction,
  getToUserPantheonSites: getToUserPantheonSites,
  createPantheonSiteForm: createPantheonSiteForm,
  createPantheonSite: createPantheonSite,
  ensureSiteExists: ensureSiteExists,
  createPantheonSiteWait: createPantheonSiteWait,
  removeSite: removeSite,
  getSite: getSite
};
