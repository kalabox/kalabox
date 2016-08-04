'use strict';

angular.module('kalabox.initialize', [
  'ui.router',
  'kalabox.nodewrappers',
  'kalabox.misc'
])
.config(function($urlRouterProvider, $stateProvider) {
  $stateProvider.state('initialize', {
    url: '/initialize',
    templateUrl: 'modules/initialize/initialize.html.tmpl',
    controller: 'InitializeCtrl'
  });
  $urlRouterProvider.otherwise('/initialize');
})
.controller('InitializeCtrl',
['$scope', '$state', 'kbox', 'globalConfig', 'sites',
  function($scope, $state, kbox, globalConfig, sites) {

    // Grab NW things so we can build a menu
    var gui = require('nw.gui');
    var mb = new gui.Menu({type: 'menubar'});

    // Add default menu options for osx
    if (process.platform === 'darwin') {
      mb.createMacBuiltin('Kalabox', {hideEdit: false, hideWindow: true});
      // TODO: move this outside the conditional once we have support for WIN/LINUX menus as well
      gui.Window.get().menu = mb;
    }

    // Set the menu

    // Take us to the Dashboard.
    kbox.then(function(kbox) {

      // Check if we are up already
      return kbox.engine.isUp()

      // Bring up the engine up if needed
      .then(function(isUp) {
        if (!isUp) {
          return kbox.engine.up();
        }
      })

      // Pre-load sites.
      .then(function() {
        return sites.get();
      })
    // Navigate to dashboard.
      .then(function() {
        $state.go('dashboard');
      });
    });

  }]);
