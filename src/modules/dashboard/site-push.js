'use strict';

angular.module('kalabox.dashboard')

.directive('sitePush', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        // Run inside of a gui task.
        guiEngine.try(function() {
          var sitePushModal = $scope.open(
            'modules/dashboard/site-push-modal.html.tmpl',
            'SitePushModal',
            {site: $scope.site}
          );
          return sitePushModal.result;
        });
      });
    }
  };
})
.controller(
  'SitePushModal',
  function($scope, $uibModalInstance, _, modalData, guiEngine) {

    guiEngine.try(function() {
      $scope.errorMessage = false;
      $scope.ok = function(message, database, files) {
        guiEngine.try(function() {
          $uibModalInstance.close();
          var site = modalData.site;
          return site.push({
            message: message || 'No commit message was given',
            database: database,
            files: files
          });
        });
      };
      $scope.cancel = function() {
        $uibModalInstance.close();
      };
    });
  }
);
