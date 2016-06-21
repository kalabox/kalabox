'use strict';

angular.module('kalabox.dashboard', [
  'ui.router',
  'ui.bootstrap',
  'kalabox.nodewrappers',
  'kalabox.guiEngine',
  'kalabox.notificationQueue',
  'kalabox.sidebar'
])
.config(function($stateProvider) {
  $stateProvider.state('dashboard', {
    url: '/dashboard',
    views: {
      '': {
        controller: 'DashboardCtrl',
        templateUrl: 'modules/dashboard/dashboard.html.tmpl'
      }
    }
  })
  .state('dashboard.shutdown', {
    url: '/dashboard/shutdown/{winVar:json}',
    views: {
      '@': {
        templateUrl: 'modules/dashboard/shutdown.html.tmpl',
        controller: 'ShutdownCtrl'
      }
    }
  });
})
/*
 * Start site if site is stopped, stop site if site is started.
 */
.directive('siteToggle', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        return guiEngine.try(function() {
          // Query running state of site.
          return $scope.site.isRunning()
          .then(function(isRunning) {
            if (isRunning) {
              // Stop site.
              return $scope.site.stop();
            } else {
              // Start site.
              return $scope.site.start();
            }
          });
        });
      });
    }
  };
})
.directive('siteBrowser', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        if ($scope.ui.states[$scope.site.machineName]) {
          guiEngine.try(function() {
            // Get reference to nw gui.
            var gui = require('nw.gui');
            // Open folder in os' default file browser.
            gui.Shell.openExternal($scope.site.url);
          });
        }
      });
    }
  };
})
.directive('siteCode', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        guiEngine.try(function() {
          var gui = require('nw.gui');
          gui.Shell.openItem($scope.site.codeFolder);
        });
      });
    }
  };
})
.directive('siteTerminal', function(guiEngine, terminal) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        guiEngine.try(function() {
          terminal.open($scope.site.codeFolder);
        });
      });
    }
  };
})
.directive('site', function() {
  return {
    restrict: 'EA',
    templateUrl: 'modules/dashboard/site.html.tmpl'
  };
})
.controller(
  'DashboardCtrl',
  function($scope, $uibModal, $timeout, $interval, $q, kbox,
    sites, providers, siteStates, _, guiEngine, $state, $rootScope) {

  //Init ui model.
  $scope.ui = {
    sites: [],
    states: {},
    jobs: [],
    meta: {
      platform: process.platform
    }
  };

  $scope.isModalOpen = false;
  $scope.errorCount = 0;

  $rootScope.providers = [];

  // Grab developer mode so we can display inch high red letters on the UI.
  kbox.then(function(kbox) {
    $scope.ui.devMode = kbox.core.deps.get('globalConfig').devMode;
    $rootScope.apps = _.values(kbox.create.getAll());
  });

  // When a site is destroyed filter the sites in the scope to remove it.
  // This needs to happen because the polling takes time to catch up.
  kbox.then(function(kbox) {
    $scope.kbox = kbox;
    // Listen to the post app destroy event.
    kbox.core.events.on('post-app-destroy', function(app) {
      // Filter sites to remove site that was just destroyed.
      $scope.ui.sites = _.filter($scope.ui.sites, function(site) {
        return site.machineName !== app.name;
      });
    });
  });

  // Modal creator.
  $scope.open = function(templateUrl, controllerName, data) {
    var uibModalInstance = $uibModal.open({
      animation: true,
      templateUrl: templateUrl,
      controller: controllerName,
      size: 'lg',
      resolve: {
        modalData: function() {
          return data;
        }
      }
    });
    return uibModalInstance;
  };

  // Handle shutting down of kalabox.
  guiEngine.try(function() {
    // Get nw window object.
    var win = require('nw.gui').Window.get();
    // Hook into the gui window closing event.
    win.on('close', function() {
      // Open a new state to inform the user that app is shutting down.
      $state.go('dashboard.shutdown', {winVar: win}, {location: false});
    });
  });

  // Initialize providers.
  guiEngine.try(function() {
    return providers.get()
    .then(function(providers) {
      $rootScope.providers = providers;
    });
  });

  var siteUpdate = $interval(function() {
    // Update site properties once a second.
    $scope.$evalAsync(function($scope) {
      var sites = $scope.ui.sites;
      _.each(sites, function(site) {
        site.update();
      });
    });
  }, 1000);

  // Helper function for reloading list of sites.
  function reloadSites() {
    function reload() {
      sites.get()
      .then(function(sites) {
        $scope.ui.sites = sites;
      });
    }
    /*
     * Reload sites mutliple times, because sometimes updates to list of sites
     * aren't ready immediately.
     */
    // Reload sites immediately.
    reload();
    // Reload sites again after 5 seconds.
    setTimeout(reload, 1000 * 5);
    // Reload sites again after 15 seconds.
    setTimeout(reload, 1000 * 15);
  }

  // Reload sites when dashboard loads.
  reloadSites();

  // Update site states whenever an update event occurs.
  sites.on('update', function() {
    reloadSites();
  });

  // Update site states whenever an update event occurs.
  siteStates().on('update', function(apps) {
    $scope.ui.states = apps;
  });

  // Reload sites when a new site is created.
  siteStates().on('create', function() {
    reloadSites();
  });

  // Reload sites when a site is destroyed.
  siteStates().on('destroy', function() {
    reloadSites();
  });

  // Poll list of errors.
  var errorPoll = $interval(function() {
    $scope.ui.errors = guiEngine.errors.list();
  }, 250);

  // Open error modal.
  $scope.$watch('ui.errors', function(errors) {
    // If we have new errors and modal isn't already open.
    if (errors && errors.length > $scope.errorCount && !$scope.isModalOpen) {
      // Open modal.
      $scope.isModalOpen = true;
      $scope.open(
        'modules/dashboard/error-modal.html.tmpl',
        'ErrorModal',
        {errors: errors, parentScope: $scope}
      ).result.then(function() {
        // After modal is closed, set the error count.
        $scope.isModalOpen = false;
        $scope.errorCount = errors.length;
      });
    }
  });

  // Destroy error and site update intervals.
  $scope.$on(
    '$destroy',
    function() {
      $interval.cancel(errorPoll);
      $interval.cancel(siteUpdate);
    }
  );

})
.controller(
  'ErrorModal',
  function($scope, $q, $uibModalInstance, kbox, _, modalData) {

  $scope.errors = modalData.errors;
  $scope.ok = function() {
    $uibModalInstance.close();
  };
})
.controller(
  'SiteCtrl',
  function($scope) {
  // Code for setting site state on view.
  $scope.siteClasses = function() {
    var currentAction = $scope.site.currentAction ? $scope.site.currentAction :
    '';
    var siteUp = $scope.ui.states[$scope.site.machineName] ? 'site-up' : '';
    return currentAction + ' ' + siteUp;
  };
  $scope.currentActionName = function() {
    if ($scope.site.currentAction) {
      var actions = {stop: 'Stopping', start: 'Starting', 'delete': 'Deleting',
      pull: 'Pulling', push: 'Pushing', add: 'Installing'};
      return actions[$scope.site.currentAction];
    }
    return false;
  };
})
.controller(
  'ShutdownCtrl',
  function($scope, $q, kbox, _, guiEngine, $stateParams) {
    $scope.win = $stateParams.winVar;

    // Stop the polling service.
    guiEngine.stop()
    // Close.
    .then(function() {
      console.log('Shutdown ran');
      $scope.win.close(true);
    });

    $scope.ok = function() {
      $scope.win.close(true);
    };
  }
)
.directive('showErrors', function() {
  return {
    restrict: 'A',
    require:  '^form',
    link: function(scope, el, attrs, formCtrl) {
      // find the text box element, which has the 'name' attribute
      var inputEl   = el[0].querySelector('[name]');
      // convert the native text box element to an angular element
      var inputNgEl = angular.element(inputEl);
      // get the name on the text box so we know the property to check
      // on the form controller
      var inputName = inputNgEl.attr('name');

      // only apply the has-error class after the user leaves the text box
      inputNgEl.bind('blur', function() {
        el.toggleClass('has-error', formCtrl[inputName].$invalid);
      });
    }
  };
})
.directive('ngEnter', function() {
  return function(scope, element, attrs) {
    element.bind('keydown keypress', function(event) {
      if (event.which === 13) {
        scope.$apply(function() {
          scope.$eval(attrs.ngEnter, {'event': event});
        });

        event.preventDefault();
      }
    });
  };
})
.directive('browser', function() {
  return {
    scope: true,
    link: function($scope, element, attrs) {
      element.on('click', function() {
        var gui = require('nw.gui');
        gui.Shell.openExternal(attrs.link);
      });
    }
  };
});
