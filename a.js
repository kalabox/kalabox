var t = require('./titanic');

t.addAction(function(done) {
  console.log('action a');
  done();
});
t.addAction(function(done) {
  console.log('action b');
  done();
});
t.addAction(function(done) {
  console.log('action c');
  done();
});

t.addCheck(function(done) {
  console.log('check a');
  done();
});
t.addCheck(function(done) {
  console.log('check b');
  done();
});
t.addCheck(function(done) {
  console.log('check c');
  done();
});

var runs = 10;
var cursor = 0;

t.run(
function() {

  cursor += 1;
  return cursor <= runs;
  
},
function(err) {

  if (err) {
    throw err;
  }
  
});
