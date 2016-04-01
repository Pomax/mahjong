// A game server
var fs = require('fs');
var express = require('express');
var app = express();
var gameManager = require('./lib/game/game-manager');

// immediate route redirect
app.get('/', function(req, res) {
  var gameid = gameManager.nextGameId();
  gameManager.reset();
  res.redirect('/game/' + gameid);
});

// game interface
app.get('/game/:gameid', function(req, res) {
  fs.readFile('./index.html', function(err, data) {
    var html = data.toString().replace(/\{\{gameid\}\}/g, req.params.gameid);
    res.status(200).type('text/html').send(html);
  });
})

app.get('/reset', function(req, res) {
  gameManager.reset();
  res.status(200).type('text/html').send('<p>ok</p>');
});

// make it happen.
var PORT = 8081;
var server = app.listen(PORT, () => {
  console.log('Game server listening on port %d', PORT);
});

// set up socket.io protocol
require('./lib/server/socket')(server);
