'use strict';

angular.module('kalabox', [
  'templates-app',
  'kalabox.nodewrappers',
  'kalabox.dashboard',
  'kalabox.initialize',
  'kalabox.sites',
  'kalabox.misc',
  'kalabox.notificationQueue',
  'ui.bootstrap',
  'mwl.bluebird'
])
.config(['$compileProvider',
  function($compileProvider) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension|blob:chrome-extension):|data:image\/)/);
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file:chrome-extension|blob:chrome-extension):/);
  }
])
.controller('AppController',
  function($scope, $window) {
  var vm = this;
  vm.bodyClasses = 'default';
  var gui = require('nw.gui');

  // this'll be called on every state change in the app
  $scope.$on('$stateChangeSuccess', function(event, toState) {
    if (angular.isDefined(toState.name)) {
      vm.bodyClasses = toState.name.replace(/\./g, '-');
      return;
    }
    vm.bodyClasses = 'default';
  });
  $window.addEventListener('keydown', function(event) {
    if (event.keyIdentifier === 'F12') {
      gui.Window.get().showDevTools();
    }
  });
  $scope.quit = function() {
    gui.App.quit();
  };
})
.run(function(kbox, notificationQueue) {
  kbox.then(function(kbox) {
    kbox.core.log.on('warn', function(message) {
      notificationQueue.add(message);
    });
  });
})
// Override the default global error handler.
.factory('$exceptionHandler', function() {
  return function(exception) {
    if (exception.message.match(/transition (superseded|prevented|aborted|failed)/)) {
      return;
    }
    var err = exception;

    // jshint camelcase:false
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
    var stack = (function() {
      if (err.jse_cause && err.jse_cause.stack) {
        return err.jse_cause.stack;
      } else {
        return err.stack;
      }
    }());
    // jshint camelcase:true
    // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

    console.log(err.message);
    console.log(stack);
  };
})
// Global error handing.
.run(function($q, $exceptionHandler) {
  // Global function for handling errors from bluebird promises.
  $q.onPossiblyUnhandledRejection($exceptionHandler);
})
.value('version', '2.0');
