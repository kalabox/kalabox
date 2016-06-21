'use strict';

angular.module('kalabox.sites', [])
/*
 * Class for encapsulating a site instance.
 */
.factory('Site', function(kbox, siteStates, _, providers, guiEngine, $q, path) {

  // Constructor.
  function Site(opts) {
    this.opts = opts;
    this.name = opts.name;
    this.machineName = opts.name.replace(/-/g, '');
    this.url = opts.url;
    this.folder = opts.folder;
    this.codeFolder = opts.codeFolder;
    this.providerName = 'pantheon';
    this.providerInfo = opts.providerInfo;
    this.framework = opts.providerInfo.framework;
    this.busy = false;
    this.update();
    this.environments = [];
    // Status message.
    this.status = null;
    // Action progress value from 0.0 -> 1.0
    this.progress = 0;
    // Initialize anything that needs to run inside of a promise.
    this.init();
  }

  /*
   * Constructor initialization that requires promises.
   */
  Site.prototype.init = function() {
    var self = this;
    // Get app.
    kbox.then(function(kbox) {
      // Recursive method to get app object.
      var getApp = function() {
        // Get app.
        return kbox.app.get(self.name)
        // Ignore errors.
        .catch(function() {})
        .then(function(app) {
          if (app) {
            // Return app.
            return app;
          } else {
            // Take a short delay then try again.
            return $q.delay(5 * 1000)
            .then(function() {
              return getApp();
            });
          }
        });
      };
      // Get app object.
      return getApp()
      // Subscribe to status message updates.
      .then(function(app) {
        // Create a throttled event emitter.
        var throttledEvents = new kbox.util.ThrottledEvents({
          throttle: function(size) {
            return size < 5 ? 0.5 : size / 2;
          }
        });
        // When a status update happens, update site status and progress.
        throttledEvents.on('status', function(msg) {
          // Update status message.
          self.status = msg;
          // Increase progress.
          var step = (1 - self.progress) / 8;
          self.progress += step;
        });
        // Emit a status update to be handled above.
        app.events.on('status', function(msg) {
          throttledEvents.emit('status', msg);
        });
      });
    });
  };

  /*
   * Update site properties.
   */
  Site.prototype.update = function() {
    // Update screenshot url.
    this.updateScreenshotUrl();
  };

  /*
   * Update screenshot image url.
   */
  Site.prototype.updateScreenshotUrl = function() {
    var timestamp = new Date().getTime();
    var imagePath = this.opts.folder ?
      path.join(this.opts.folder, 'screenshot.png') + '?' + timestamp :
      this.opts.image;
    this.image = 'file://' + imagePath;
  };

  /*
   * Runs before an action is queued.
   */
  Site.prototype.beforeQueue = function() {
    var self = this;
    return $q.try(function() {
      // Signal that site is busy.
      self.busy = true;
    });
  };

  /*
   * Runs after an action is queued.
   */
  Site.prototype.afterQueue = function() {
    var self = this;
    // Have progress incrementally step to being complete over a short
    // amount of time.
    return Promise.try(function() {
      self.status = 'Completing...';
      function rec() {
        if (self.progress < 1) {
          self.progress += _.min([0.1, 1 - self.progress]);
          return Promise.delay(0.5 * 1000)
          .then(function() {
            return rec();
          });
        }
      }
      return rec();
    })
    // Cleanup.
    .then(function() {
      // Signal site is no longer busy.
      self.busy = false;
      // Clear status message.
      self.status = null;
      // Set progress back to zero.
      self.progress = 0;
    });
  };

  /*
   * Call fn function within a gui engine queue.
   */
  Site.prototype.queue = function(desc, fn) {
    var self = this;
    // Add job to queue.
    return guiEngine.queue.add(desc, self, function(update) {
      // Setup for queued action.
      return self.beforeQueue()
      // Call fn function.
      .then(function() {
        return fn.call(self, update);
      })
      // When queue is finished.
      .finally(function() {
        // Cleanup after queued action.
        return self.afterQueue();
      });
    });
  };

  /*
   * Returns boolean set to true if site is running.
   */
  Site.prototype.isRunning = function() {
    var self = this;
    return $q.resolve(siteStates().apps[self.machineName]);
  };

  /*
   * Get this sites provider.
   */
  Site.prototype.getProvider = function() {
    var self = this;
    // Get app.
    return kbox.then(function(kbox) {
      return kbox.app.get(self.name);
    })
    // Find correct provider.
    .then(function(app) {
      return providers.get(
        self.providerName,
        app.config.pluginconfig[self.providerName].email
      );
    });
  };

  /*
   * Get list of site environments.
   */
  Site.prototype.getEnvironments = function() {
    var self = this;
    // Get provider.
    return self.getProvider()
    // Get list of provider's sites.
    .then(function(provider) {
      // Refresh list of sites.
      return provider.refresh()
      // Return list of sites.
      .then(function() {
        return provider.sites;
      });
    })
    // Find provider site that matches this site.
    .then(function(sites) {
      var siteName = self.opts ? self.opts.providerInfo.site : self.name;
      return _.find(sites, function(site) {
        return site.name === siteName;
      });
    })
    // Throw error if site doesn't exist.
    .tap(function(site) {
      if (!site) {
        throw new Error('Site not found: ' + self.name);
      }
    })
    // Get list of environments for site.
    .then(function(site) {
      return site.getEnvironments();
    })
    // Cache environments.
    .tap(function(envs) {
      self.environments = envs;
    });
  };

  /*
   * Start site.
   */
  Site.prototype.start = function() {
    var self = this;
    // Run as a queued job.
    return self.queue('Starting site: ' + self.name, function() {
      return kbox.then(function(kbox) {
        return kbox.app.get(self.name)
        .then(function(app) {
          return kbox.app.start(app);
        });
      });
    });
  };

  /*
   * Stop site.
   */
  Site.prototype.stop = function() {
    var self = this;
    // Run as a queued job.
    return self.queue('Stopping site: ' + self.name, function() {
      return kbox.then(function(kbox) {
        return kbox.app.get(self.name)
        .then(function(app) {
          return kbox.app.stop(app);
        });
      });
    });
  };

  /*
   * Pull site.
   */
  Site.prototype.pull = function(opts) {
    var self = this;
    // Run as a queued job.
    return self.queue('Pulling site: ' + self.name, function(update) {
      // Get kbox core library.
      return kbox.then(function(kbox) {
        // Initialize app context.
        return kbox.app.get(self.name)
        // Do a pull on the site.
        .then(function() {
          var pull = kbox.integrations.get(self.providerName).pull();
          // Update job's status message with info from pull.
          pull.on('update', function(msg) {
            update(msg.status);
          });
          return pull.run(opts);
        });
      });
    });
  };

  /*
   * Push site.
   */
  Site.prototype.push = function(opts) {
    var self = this;
    // Run as a queued job.
    return self.queue('Pushing site: ' + self.name, function(update) {
      // Get kbox core library.
      return kbox.then(function(kbox) {
        // Initialize app context.
        return kbox.app.get(self.name)
        // Do a pull on the site.
        .then(function() {
          var push = kbox.integrations.get(self.providerName).push();
          // Update job's status message with info from push.
          push.on('update', function(msg) {
            update(msg.status);
          });
          return push.run(opts);
        });
      });
    });
  };

  /*
   * Remove site.
   */
  Site.prototype.remove = function() {
    var self = this;
    // Run as a queued job.
    return self.queue('Removing site: ' + self.name, function() {
      return kbox.then(function(kbox) {
        return kbox.app.get(self.name)
        .then(function(app) {
          return kbox.app.destroy(app);
        });
      });
    })
    // Make sure site remains busy until it's removed.
    .then(function() {
      self.busy = true;
    });
  };

  // Static helper function to create from a kalabox app object.
  Site.fromApp = function(app) {
    return new Site({
      name: app.name,
      url: app.url,
      folder: app.root,
      codeFolder: app.config.sharing.codeRoot,
      providerInfo: app.config.pluginconfig[app.config.type]
    });
  };

  Site.fromPlaceHolder = function(opts) {
    var site = new Site({
      name: opts.name,
      url: null,
      folder: null,
      codeFolder: null,
      image: 'images/kalabox/screenshot.png',
      providerInfo: {
        framework: 'drupal'
      }
    });
    site.isPlaceHolder = true;
    // Set busy.
    site.busy = true;
    // Set initial status message.
    site.status = 'Creating...';
    return site;
  };

  /*
   * Static function for adding a site.
   */
  Site.add = function(opts) {
    // Add job to queue.
    return guiEngine.queue.add('Adding site: ' + opts.site,
      {name: opts.name},
      function() {
      return kbox.then(function(kbox) {
        // Get config.
        var config = kbox.core.deps.get('globalConfig');
        // Option defaults.
        opts._ = opts._ || [];
        opts.h = opts.h || false;
        opts.v = opts.v || false;
        opts.versbose = opts.versbose || false;
        opts.needsFramework = opts.needsFramework || false;
        opts._type = opts.provider.name;
        opts.dir = opts.dir || config.appsRoot;
        // Get app.
        var app = kbox.create.get(opts.provider.name);
        // Create app.
        return kbox.create.createApp(app, opts);
      });
    });
  };

  return Site;

})
/*
 * Object for getting a cached list of site instances.
 */
.factory('sites', function(kbox, Site, _) {

  // Node modules.
  var events = require('events');
  var util = require('util');

  // Constructor.
  function Sites() {
    this.sites = [];
    this.tempSites = [];
    events.EventEmitter.call(this);
  }

  // Inherit from event emitter.
  util.inherits(Sites, events.EventEmitter);

  // Add site.
  Sites.prototype.add = function(opts) {

    // Keep reference for later.
    var self = this;

    // Add a placeholder site so the user see it right away.
    this.tempSites.push(Site.fromPlaceHolder(opts));
    // Signal an update.
    this.emit('update');

    // Add site.
    return Site.add(opts)
    // Make sure the busy flag gets unset when add is complete.
    .finally(function() {
      var found = _.find(self.sites, function(site) {
        return site.name === opts.name;
      });
      if (found) {
        return found.afterQueue();
      }
    });

  };

  // Update site list.
  Sites.prototype.update = function() {

    // Keep reference for later.
    var self = this;

    return kbox.then(function(kbox) {

      // Get an up to date list of sites.
      return kbox.app.list({useCache: false})
      // Map from apps to sites.
      .map(Site.fromApp)
      .then(function(newSites) {

        // Add new site that we don't already have.
        _.each(newSites, function(newSite) {
          var found = _.find(self.sites, function(site) {
            return site.name === newSite.name;
          });
          if (!found) {
            // Add site.
            self.sites.push(newSite);
            // Sort site.
            self.sites = _.sortBy(self.sites, function(site) {
              return site.name;
            });
          }
        });

        // Remove temp sites that are no longer needed.
        self.tempSites = _.filter(self.tempSites, function(tempSite) {
          return !_.find(self.sites, function(site) {
            var found = tempSite.name === site.name;
            if (found) {
              site.busy = true;
              site.status = tempSite.status;
              site.progress = tempSite.progress;
            }
            return found;
          });
        });

        // Remove sites that no longer exist.
        self.sites = _.filter(self.sites, function(site) {
          return !!_.find(newSites, function(newSite) {
            return newSite.name === site.name;
          });
        });

      });

    });

  };

  // Get list of sites.
  Sites.prototype.get = function(name) {
    var self = this;
    // Update site list.
    return this.update()
    // Return site list.
    .then(function() {
      if (name) {
        return self.sites[name];
      } else {
        // Concat sites and temp sites, then sort by name.
        return _.sortBy(
          _.flatten([self.sites, self.tempSites]),
          function(site) {
            return site.name;
          });
      }
    });
  };

  // Return class instance.
  return new Sites();

})
/*
 * Object for getting a cached list of site instance states.
 */
.factory('siteStates', function(kbox, _) {

  return _.once(function() {

    var events = require('events');
    var util = require('util');

    // Constructor.
    function SiteStates() {
      this.apps = {};
      events.EventEmitter.call(this);
      this.init();
    }
    // Inherit from event emitter.
    util.inherits(SiteStates, events.EventEmitter);

    // Initialize.
    SiteStates.prototype.init = function() {

      var self = this;

      return kbox.then(function(kbox) {

        // Map container id to container name.
        var mapId = _.memoize(function(id) {
          // Inspect container.
          return kbox.engine.inspect({containerID: id})
          // Return container name.
          .then(function(data) {
            return data.Name ? _.trim(data.Name, '/') : null;
          })
          // Ignore errors and return undefined.
          .catch(function() {
            /*
             * It's expected to have a lot of instances where we fail to inspect
             * a container here, so ignore errors and assume we didn't need to
             * map that container.
             */
          });
        });

        // Promise chain for serializing events.
        var p = kbox.Promise.resolve();

        // Get list of containers.
        return kbox.engine.list()
        // Seed memoized map.
        .each(function(container) {
          return mapId(container.id);
        })
        // Get event stream.
        .then(function() {
          return kbox.engine.events();
        })
        .then(function(result) {

          // Set encoding so events give a string rather than a Buffer.
          result.setEncoding('utf8');

          // Handle data events from the result stream.
          result.on('data', function(data) {

            // Serialize events by adding to tail of promise chain.
            p = p.then(function() {
              // Run inside of a promise.
              return kbox.Promise.try(function() {

                // Parse data string into a json object.
                data = JSON.parse(data);

                // Get action.
                var action = _.get(data, 'status');
                // Get container id.
                var id = _.get(data, 'id');

                if (action && id) {

                  // Get name of the container.
                  return mapId(id)
                  .then(function(name) {

                    // Split the container name into it's parts.
                    var parts = name ? name.split('_') : [];
                    // Get name of app from container name's first part.
                    var app = parts[0];
                    // Get container type from container name's second part.
                    var container = parts[1];

                    // Only events with a container of appserver are interesting.
                    if (parts.length === 3 && container === 'token') {
                      if (action === 'create') {
                        // App created, so add to list of app states.
                        self.apps[app] = false;
                        self.emit('create', app);
                        self.emit('update', self.apps);
                      } else if (action === 'start') {
                        // App started, set state to true.
                        self.apps[app] = true;
                        self.emit('start', app);
                        self.emit('update', self.apps);
                      } else if (action === 'destroy') {
                        self.emit('destroy', app);
                        self.emit('update', self.apps);
                      } else if (action === 'die' || action === 'stop') {
                        // App stopped, set state to false.
                        self.apps[app] = false;
                        self.emit('stop', app);
                        self.emit('update', self.apps);
                      }
                    }

                  });

                }

              })
              // Ignore errors.
              .catch(function(err) {
                console.log(err.message);
                console.log(err.stack);
              });
            });

          });
        })
        // Ignore errors.
        .catch(function(err) {
          console.log(err.message);
          console.log(err.stack);
          throw err;
        });
      });
    };

    // Return singleton instance.
    return new SiteStates();

  });

});
