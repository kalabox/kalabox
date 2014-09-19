var express = require('express'),
  app = express(),
  server = require('http').createServer(app);

app.get('/', function(req, res) {
  res.json({
    status: "ok"
  });
});

var port = process.env.HTTP_PORT || 3000;
server.listen(port);
console.log('Listening on port ' + port);