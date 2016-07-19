'use strict';

angular.module('kalabox.dashboard')
.controller('SiteCtrl', function($scope) {
  // Code for setting site state on view.
  $scope.siteClasses = function() {
    var currentAction = $scope.site.currentAction ? $scope.site.currentAction :
    '';
    var siteUp = $scope.ui.states[$scope.site.name] ? 'site-up' : '';
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
          var isRunning = $scope.ui.states[$scope.site.name];
          if (isRunning) {
            // Stop site.
            return $scope.site.stop();
          } else {
            // Start site.
            return $scope.site.start();
          }
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
        if ($scope.ui.states[$scope.site.name]) {
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
});
