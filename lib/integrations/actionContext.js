'use strict';

module.exports = function(kbox) {

  // Node modules.
  var util = require('util');
  var EventEmitter = require('events').EventEmitter;

  // NPM modules.
  var _ = require('lodash');

  // Kalabox modules.
  var Promise = kbox.Promise;

  /*
   * Class for encapsulating return context of an integration action.
   */
  function ActionContext(opts) {
    this.method = opts.method;
    this.status = null;
    EventEmitter.call(this);
  }
  util.inherits(ActionContext, EventEmitter);

  /*
   * Run action.
   */
  ActionContext.prototype.run = function(arg1, arg2) {
    var self = this;
    // Run method.
    self.promise = Promise.try(function() {
      return self.method.call(self, arg1, arg2);
    });
    // Return promise.
    return self.promise;
  };

  /*
   * Ask who ever called the action an array of questions.
   */
  ActionContext.prototype.ask = function(questions) {
    var self = this;
    // Map questions to answers.
    var answers = _.map(questions, function(question) {
      return Promise.fromNode(function(cb) {
        // Create function for answering question with an answer.
        question.answer = function(response) {
          cb(null, response);
        };
        // Create function for returning an error as an answer.
        question.fail = function(err) {
          cb(err);
        };
      })
      .then(function(response) {
        return {
          id: question.id,
          answer: response
        };
      });
    });
    // Emit ask event.
    self.emit('ask', questions);
    // Return answers.
    return Promise.all(answers)
    // Reduce array of answers to an object of answers.
    .reduce(function(acc, answer) {
      acc[answer.id] = answer.answer;
      return acc;
    }, {});
  };

  /*
   * Update status of action.
   */
  ActionContext.prototype.update = function(status) {
    this.status = status;
    this.emit('update', this);
  };

  return ActionContext;

};
