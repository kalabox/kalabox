'use strict';

angular.module('kalabox.notificationQueue', [
  'ui.router',
  'ui.bootstrap',
  'kalabox.nodewrappers',
  'kalabox.guiEngine'
])
.factory('notificationQueue', function(_) {
  var notificationQueue = {};
  notificationQueue.unread = false;

  notificationQueue.notifications = [];

  notificationQueue.add = function(message) {
    this.notifications.push(
      {message: message, read: false, id: this.notifications.length + 1}
    );
    this.unread = true;
  };

  notificationQueue.markAllRead = function() {
    var notifications = this.notifications;
    this.notifications = _.forEach(notifications, function(value, key) {
      notifications[key].read = true;
    });
    this.unread = false;
  };

  notificationQueue.delete = function(id) {
    var notifications = this.notifications;
    this.notifications = _.reject(notifications, function(entry) {
      return entry.id === id;
    });

    if (this.notifications.length === 0) {
      this.unread = false;
    }
  };

  return notificationQueue;
})
.directive('notificationCenter', function() {
  return {
    controller: function($scope, notificationQueue) {
      $scope.queue = notificationQueue;
      $scope.markAllRead = function() {
        $scope.apply(function() {
          notificationQueue.markAllRead();
        });
      };
    },
    scope: true,
    templateUrl: 'modules/notificationQueue/notificationQueue.html.tmpl'
  };
});
