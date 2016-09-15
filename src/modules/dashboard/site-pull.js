'use strict';

angular.module('kalabox.dashboard')

.directive('sitePull', function(guiEngine) {
  return {
    scope: true,
    link: function($scope, element) {
      element.on('click', function() {
        // Run inside of a gui task.
        guiEngine.try(function() {
          var sitePullModal = $scope.open(
            'modules/dashboard/site-pull-modal.html.tmpl',
            'SitePullModal',
            {
              site: $scope.site
            }
          );
          return sitePullModal.result;
        });
      });
    }
  };
})

.controller(

  'SitePullModal',
  function($scope, $uibModalInstance, _, modalData, guiEngine) {

    guiEngine.try(function() {
      $scope.site = modalData.site;
      $scope.errorMessage = false;
      $scope.opts = {};
      $scope.ok = function(database, files) {
        guiEngine.try(function() {
          $uibModalInstance.close();
          var site = modalData.site;
          return site.pull({
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
