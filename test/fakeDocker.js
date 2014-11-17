'use strict';

var FakeStream = require('./fakeStream.js');

function FakeDocker() {
  this._fakeStream = new FakeStream();
  this._pullHook = null;
  this._pullError = null;
}

FakeDocker.prototype.restore = function() {
  this._fakeStream.restore();
  this._pullHook = null;
  this._pullError = null;
};

FakeDocker.prototype.getStream = function() {
  return this._fakeStream;
};

FakeDocker.prototype.setPullHook = function(callback) {
  this._pullHook = callback;
};

FakeDocker.prototype.setPullError = function(err) {
  this._pullError = err;
};

FakeDocker.prototype.pull = function(imageName, callback) {
  callback(this._pullError, this._fakeStream);
  if (this._pullHook) {
    this._pullHook(this._fakeStream);
  }
};

FakeDocker.prototype.buildImage = function(data, imageName, callback) {
  callback(null, this._fakeStream);
};

module.exports = FakeDocker;
