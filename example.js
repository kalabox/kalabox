var t = require('./titanic');
var krun = require('./krun');

t.addAction(function(done) {
  krun()
  .run('kbox down', 20).ok()
  .run('kbox status', 5).ok().expect('down\n')
  .run('kbox up', 30).ok()
  .run('kbox status', 5).ok().expect('up\n')
  .call(function(done) {
    console.log('output -> ' + this.output);
    done();
  })
  .done(done);
});

t.addCheck(function(done) {
  krun()
  .run('kbox status')
  .ok()
  .expect('up\n')
  .done(done);  
});

var restore = function(done) {
  done();
};

var runs = 20;
var cursor = 0;

t.run(
function() {

  cursor += 1;
  return cursor <= runs;
  
},
restore,
function(err) {

  if (err) {
    throw err;
  }
  
});
