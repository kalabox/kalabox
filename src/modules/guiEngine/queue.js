'use strict';

angular.module('kalabox.guiEngine')
.factory('queueService', function($q, errorService, kbox, statusUpdates, _) {

  // Head of promise chain.
  var _hds = {};

  // Flag to cancel pending jobs, for shutdown.
  var _stopFlag = false;

  // Current job that is running, if null then no jobs are running.
  var _currents = {};

  // Handle kbox status message updates.
  statusUpdates.then(function(statusUpdates) {
    statusUpdates.on('update', function(/*message*/) {
      // @todo:
    });
  });

  /*
   * Add a job to the queue.
   */
  function add(desc, site, fn) {
    // Create new promise to signal when this added queue job is done.
    return $q.fromNode(function(cb) {
      var siteName = site.name;
      // Add to end of promise chain.
      _hds[siteName] = _hds[siteName] || Promise.resolve();
      _hds[siteName] = _hds[siteName].then(function() {
        if (!_stopFlag) {
          // Set current job.
          _currents[siteName] = {
            title: desc,
            message: null,
            fn: fn
          };
          // Update function to update current job's message.
          var update = function(message) {
            if (_currents[siteName]) {
              _currents[siteName].message = message;
            }
          };
          // Run function.
          return $q.try(function() {
            return fn(update);
          });
        }
      })
      // Set current job back to null.
      .finally(function() {
        _currents[siteName] = null;
      })
      .then(function() {
        // Signal job is done.
        cb();
      })
      // Make sure errors get reported to the error service.
      .catch(function(err) {
        // Signal job is done with an error.
        cb(err);
        return errorService.report(err);
      });
    });
  }

  /*
   * Cancel pending jobs and wait on current job to finish.
   */
  function stop() {
    _stopFlag = true;
    return $q.all(_.values(_hds));
  }

  /*
   * Module API.
   */
  return {
    add: add,
    jobs: function() {
      return [];
    },
    isRunning: function() {
      return _.find(_.values(_currents), _.identity);
    },
    currentJobs: function() {
      return _currents;
    },
    stop: stop
  };

});
