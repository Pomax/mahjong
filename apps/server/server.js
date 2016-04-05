// A game server
var fs = require('fs');
var path = require('path');
var express = require('express');
var app = express();
var gameManager = require('./lib/game/game-manager');
var PORT = 8081;

// immediate route redirect
app.get('/', function(req, res) {
  console.log("redirecting to test page");
  res.redirect('/test');
});

// game interface
app.get('/test', function(req, res) {
  fs.readFile(path.join(__dirname, 'index.html'), function(err, data) {
    var html = data.toString().replace(/\{\{host\}\}/g, process.env.HOSTNAME || "http://localhost:"+PORT);
    res.status(200).type('text/html').send(html);
  });
})

app.get('/reset', function(req, res) {
  gameManager.reset();
  res.status(200).type('text/html').send('<p>ok</p>');
});

app.use('/client', express.static(path.join(__dirname, '../client/web/')));

// make it happen.
var server = app.listen(PORT, () => {
  console.log('Game server listening on port %d', PORT);
});

// set up socket.io protocol
require('socket.io').listen(server).on('connection', function (socket) {
  gameManager.manageConnection(socket);
});
