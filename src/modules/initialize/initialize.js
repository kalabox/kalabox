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

    var gui = require('nw.gui');
    var mb = new gui.Menu({type: 'menubar'});
    if (process.platform === 'darwin') {
      mb.createMacBuiltin('Kalabox', {hideEdit: false, hideWindow: true});
    }
    gui.Window.get().menu = mb;

    // Take us to the Dashboard.
    kbox.then(function(kbox) {
      // Bring engine up.
      return kbox.engine.up()
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
