'use strict';

angular.module('kalabox.dashboard')

.directive('siteRemove', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        guiEngine.try(function() {
          var siteRemoveModal = $scope.open(
            'modules/dashboard/site-remove-modal.html.tmpl',
            'SiteRemoveModal',
            {provider: $scope.provider, site: $scope.site}
          );
          return siteRemoveModal.result;
        });
      });
    }
  };
})
.controller(
  'SiteRemoveModal',
  function($scope, $q, $uibModalInstance, kbox, _, modalData, guiEngine) {

    guiEngine.try(function() {
      // Set provider.
      $scope.provider = modalData.provider;
      // Set site.
      $scope.site = modalData.site;
      // Modal function.
      $scope.ok = function(/*config*/) {

        // Run inside a gui task.
        guiEngine.try(function() {

          // Remove site.
          $scope.site.remove();

          // Close the modal.
          $uibModalInstance.close();
        });
      };
      $scope.cancel = function() {
        $uibModalInstance.close();
      };
    });

  }
);
