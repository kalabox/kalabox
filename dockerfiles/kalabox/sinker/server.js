var sinker = require('./sinker');
var net = require('net');
var dir = process.argv[2];

var server = net.createServer(function (stream) {
    var sink = sinker(dir);
    sink.pipe(stream).pipe(sink);
});
server.listen(5000);
