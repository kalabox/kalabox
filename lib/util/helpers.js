'use strict';

/*
 * Kalabox util helper module.
 */

var helperIdent = function(x) { return x; };

var helperFindAsync = function(elts, test, callback) {
  var rec = function(elts, errs) {
    if (elts.length === 0) {
      if (errs.length === 0) {
        callback(null);
      } else {
        callback(errs);
      }
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      test(hd, function(err, result) {
        if (result) {
          callback(err, result);
        } else {
          if (err) {
            errs.push(err);
          }
          rec(tl, errs);
        }
      });
    }
  };
  rec(elts, []);
};

var helperMapAsync = function(elts, callback, done) {
  var rec = function(elts, errs) {
    if (elts.length === 0) {
      if (errs.length === 0) {
        done(null);
      } else {
        done(errs);
      }
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      callback(hd, function(err, data) {
        if (err !== null) {
          errs.push(err);
        }
        return rec(tl, errs);
      });
    }
  };
  rec(elts, []);
};

var helperFindMap = function(elts, filter, map) {
  var rec = function(elts) {
    if (elts.length === 0)  {
      return null;
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      if (filter(hd)) {
        return map(hd);
      } else {
        return rec(tl);
      }
    }
  };
  return rec(elts);
};

var helperFilterMap = function(elts, filter, map) {
  var rec = function(elts, results) {
    if (elts.length === 0) {
      return results;
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      if (filter(hd)) {
        results.push(map(hd));
      }
      return rec(tl, results);
    }
  };
  return rec(elts, []);
};

var helperFilterMap2 = function(elts, map) {
  var rec = function(elts, results) {
    if (elts.length === 0) {
      return results;
    } else {
      var hd = elts[0];
      var tl = elts.slice(1);
      var result = map(hd);
      if (result !== null) {
        results.push(result);
      }
      return rec(tl, results);
    }
  };
  return rec(elts, []);
};

var helperFind = function(elts, filter) {
  return helperFindMap(elts, filter, helperIdent);
};

var helperFilter = function(elts, filter) {
  return helperFilterMap(elts, filter, helperIdent);
};

module.exports = {
  filter: helperFilter,
  filterMap: helperFilterMap,
  filterMap2: helperFilterMap2,
  find: helperFind,
  findMap: helperFindMap,
  mapAsync: helperMapAsync,
  findAsync: helperFindAsync
};
