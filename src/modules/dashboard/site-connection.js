'use strict';

angular.module('kalabox.dashboard')

.directive('siteConnection', function(guiEngine, Site, kbox) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        // Run inside of a gui task.
        guiEngine.try(function() {
          // Get the services.
          kbox.then(function(kbox) {
            return kbox.app.get($scope.site.name)
            .then(function(app) {
              return kbox.app.services(app);
            })
            .then(function(services) {
              var siteConnectModal = $scope.open(
                'modules/dashboard/site-connection-modal.html.tmpl',
                'SiteConnectModal',
                {
                  kbox: kbox,
                  site: $scope.site,
                  services: services
                }
              );
              return siteConnectModal.result;
            });
          });
        });
      });
    }
  };
})

.controller(
  'SiteConnectModal',
  function($scope, $uibModalInstance, _, modalData, guiEngine) {

    guiEngine.try(function() {
      $scope.services = modalData.services;
      $scope.site = modalData.site;
      $scope.ok = function() {
        $uibModalInstance.close();
      };
      $scope.cancel = function() {
        $uibModalInstance.close();
      };
    });

  }
)

.directive('selectOnClick', function() {
  return {
    restrict: 'A',
    link: function(scope, element) {
      var focusedElement;
      element.on('click', function() {
        if (focusedElement !== this) {
          this.select();
          focusedElement = this;
        }
      });
      element.on('blur', function() {
        focusedElement = null;
      });
    }
  };
});
