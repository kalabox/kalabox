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
.controller(
  'DashboardCtrl',
  function($scope, $uibModal, $interval, $q, kbox,
    sites, Site, providers, _, guiEngine, $state, $rootScope) {

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
    kbox.app.list().each(function(app) {
      app.status().then(function(status) {
        $scope.$applyAsync(function() {
          $scope.ui.states[app.name] = status[1];
        });
      });
    });
  });

  function findSite(app, sites) {
    return _.findIndex(sites, function(site) {
      return site.name === app.name;
    });
  }

  // Handle site state.
  kbox.then(function(kbox) {
    kbox.core.events.on('post-create-app', function(app) {
      // Updates sites.
      // Update site based on creation.
      $scope.ui.sites.push(Site.fromApp(app));
      var index = findSite(app, $scope.ui.sites);
      $scope.ui.sites[index].busy = true;
    });

    kbox.core.events.on('app-started', function(app) {
      $scope.ui.states[app.name] = true;
    });

    kbox.core.events.on('app-created', function(app) {
      // Set site active.
      var index = findSite(app, $scope.ui.sites);
      $scope.$applyAsync(function() {
        $scope.ui.sites[index].updateScreenshotUrl();
        $scope.ui.sites[index].busy = false;
        $scope.ui.states[app.name] = true;
      });
    });

    kbox.core.events.on('app-stopped', function(app) {
      $scope.ui.states[app.name] = false;
    });

    kbox.core.events.on('app-destroyed', function(app) {
      // Filter sites to remove site that was just destroyed.
      $scope.$applyAsync(function() {
        $scope.ui.sites = _.filter($scope.ui.sites, function(site) {
          return site.name !== app.name;
        });
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

  // Reload sites and get states when dashboard loads.
  reloadSites();

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
