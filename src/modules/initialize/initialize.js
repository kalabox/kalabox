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
  })
  .state('installer-error', {
    url: '/installer-error',
    templateUrl: 'modules/initialize/installer-error.html.tmpl',
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

    // Decide on next location.
    globalConfig.then(function(globalConfig) {
      if (globalConfig.provisioned) {
        // Bring engine up then navigate to dashboard.
        return kbox.then(function(kbox) {
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
      } else {
        // Install hasn't run.
        $state.go('installer-error');
      }
    });

  }]);
