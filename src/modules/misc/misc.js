'use strict';

angular.module('kalabox.misc', [
  'ui.router',
  'kalabox.nodewrappers'
])
.controller('RandomMessageCtrl',
  function($scope, $interval) {
  var randomMessages = [
    'Reticulating splines',
    'Realizing the power of now',
    'Tripping the light fantastic',
    'Dreaming of electric sheep',
    'Being your beast of burden',
    'Taking the load off Fanny',
    'Exercising the right to arm bears',
    'Applying container grease',
    'Putting the last \"P\" on PHP',
    'Making the world safe for democracy',
    'Failing to be afraid of fear itself',
    'Feeding the llama',
    'Burning the man',
    'Clearing dust out of the box',
    'Plumbing the series of tubes',
    'Crossing the Rubicon',
    'Rebalancing your portfolio',
    'Slicing, dicing, and making french fries',
    'Improving your child\'s SAT score',
    'Teaching the virtue of patience',
    'Nurturing your web projects',
    'Fixing the flux capacitor',
    'Repairing the warp coil',
    'Wiping the transporter buffer',
    'Restoring your faith in humanity',
    'Investing in your future',
    'Giving hope to a new generation',
    'Celebrating slack',
    'Groking in fullness',
    'Climbing it because it\'s there',
    'Stacking containers'
  ];
  var rotateMessage = $interval(function() {
    $scope.$evalAsync(function($scope) {
      $scope.ui.randomMessage = randomMessages[
        Math.floor(Math.random() * randomMessages.length)
      ];
    });
  }, 3000);

  // Destroy rotateMessage.
  $scope.$on(
    '$destroy',
    function() {
      $interval.cancel(rotateMessage);
    }
  );

  // Best practices is to manage our data in a scope object
  $scope.ui = {
    randomMessage: 'Let\'s get this party started'
  };

});
