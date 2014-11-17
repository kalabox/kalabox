'use strict';

var sinon = require('sinon');

function FakeStream() {
  this._data = null;
  this._end = null;
}

FakeStream.prototype.restore = function() {
  this._data = null;
  this._end = null;
};

FakeStream.prototype.on = function(name, callback) {
  if (name === 'data') {
    this._data = callback;
  } else if (name === 'end') {
    this._end = callback;
  }
};

FakeStream.prototype.data = function(data) {
  if (this._data) {
    this._data(data);
  }
};

FakeStream.prototype.end = function() {
  if (this._end) {
    this._end();
  }
};

module.exports = FakeStream;
