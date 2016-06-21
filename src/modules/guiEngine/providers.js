'use strict';

angular.module('kalabox.dashboard')
.factory('Provider', function(kbox, _, $q) {

  /*
   * [Constructor].
   */
  function Provider(opts) {

    // Required.
    this.integration = opts.integration;
    this.name = opts.integration.name;

    // Optional.
    this.username = opts.username;

    // Init.
    this.sites = [];
    this.refreshing = false;
    this.displayName = this.username ?
      this.username :
      this.name;

  }

  /*
   * Return true if this provider has been authorized.
   */
  Provider.prototype.authorized = function() {
    return !!this.username;
  };

  /*
   * Authorize provider with username.
   */
  Provider.prototype.authorize = function(username, password) {
    var self = this;
    var auth = self.integration.auth();
    return auth.run(username, password)
    .then(function() {
      self.username = username;
      return self.refresh();
    });
  };

  /*
   * Refresh provider's state.
   */
  Provider.prototype.refresh = function() {
    var self = this;
    // Refresh sites.
    return $q.try(function() {
      if (!self.username) {
        throw new Error('Provider has no user name!');
      }
      // Clear list of sites.
      self.sites = [];
      // Signal provider is refreshing.
      self.refreshing = true;
      var sites = self.integration.sites();
      var siteProvider = _.cloneDeep(self);
      delete siteProvider.sites;
      // Get list of sites.
      return sites.run(self.username)
      // Map sites.
      .map(function(site) {
        self.sites.push({
          name: site.name,
          provider: siteProvider,
          getEnvironments: site.getEnvironments
        });
      });
    })
    // Return list of sites.
    .return(self.sites)
    // Set a timeout.
    .timeout(15 * 1000)
    // Make sure we signal that we are no longer refreshing.
    .finally(function() {
      self.refreshing = false;
    })
    // Wrap errors.
    .catch(function(err) {
      console.log('Error refreshing sites: %s', self.username);
      return err;
    });
  };

  /*
   * [STATIC] Get a list of providers.
   */
  Provider.list = function() {
    // Get list of integrations.
    return kbox.then(function(kbox) {
      return _.values(kbox.integrations.get());
    })
    // Map each integration into a list of providers.
    .reduce(function(acc, integration) {
      // Get list of usersnames for this integration.
      return integration.logins().run().then(function(usernames) {
        // Just in case usernames is null.
        usernames = usernames || [];
        // Add an empty username for the default provider.
        usernames.push(null);
        // Reverse list of usernames.
        usernames.reverse();
        // Return usernames.
        return usernames;
      })
      // Map username to a provider and add to accumilator.
      .each(function(username) {
        var provider = new Provider({
          integration: integration,
          username: username
        });
        acc.push(provider);
      })
      // Return accumilator.
      .return(acc);
    }, [])
    // Set a timeout.
    .timeout(15 * 1000)
    // Wrap errors.
    .wrap('Error building list of providers.');
  };

  // Return constructor.
  return Provider;

})
.factory('providers', function(Provider, _) {
  return {
    get: function(providerName, username) {
      // Get a list of providers.
      return Provider.list()
      // Either return list or if a name is given then search.
      .then(function(providers) {
        if (providerName) {
          // Search for provider buy name.
          var found = _.find(providers, function(provider) {
            var correctProviderName = provider.name === providerName;
            var correctUsername =
              username ?
                provider.username === username :
                true;
            return correctProviderName && correctUsername;
          });
          if (!found) {
            throw new Error('Provider not found: ' + name);
          }
          return found;
        } else {
          // Return full list.
          return providers;
        }
      });
    }
  };
});
