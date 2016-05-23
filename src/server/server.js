/**
 * This is a simple express server that acts as mediator between clients and the mahjong manager,
 * by exposing URLs that effect game logic such as joining the ecosystem, starting games, etc.
 */
'use strict'

var fs = require('fs');
var path = require('path');
var express = require('express');
var Manager = require('../core/manager');
var getRandomAnimal = require('../lib/names');

var habitat = require('habitat');
habitat.load(path.join(__dirname, ".env"));
var PORT = process.env.PORT || 8081;
var HOST = process.env.HOST || "http://localhost";
if (PORT !== 80 && HOST.indexOf(':') === -1) { HOST += ':' + PORT; }

var app = express();
var gm = new Manager();

// static directories
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, '../../images')));

// redirect / to index.html
app.get('/', (req,res) => res.redirect('/index.html'));

// load the client page
app.get('/client', (req,res) => res.redirect('/client.html'));

// special handling for socket.io
app.get('/socket.io', (req,res) => {
  res.setHeader('Access-Control-Allow-Origin', 'TRUE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.sendFile(path.join(__dirname, 'public/js/socket.io.js'));
});

// register as a player
app.get('/register/:name', (req, res) => {
  let options = { name: req.params.name };
  gm.createPlayer(options, (player, port) => {
    let id = player.id;
    res.json({ id, port });
  });
});

// start a new single-player game
app.get('/game/new/:id/:name', (req, res) => {
  var id = req.params.id;
  var name = req.params.name;
  var game = gm.createGame('minimal');
  var Bot = require('../client/basic/client');

  // Player 0 is human.
  game.addPlayer(gm.getPlayer(id));

  // The rest are bots.
  [1,2,3].map(id => {
    var name = getRandomAnimal();
    gm.createPlayer({ name }, (player, port) => {
      new Bot(name, port, () => game.addPlayer(player));
    });
  });
});

// make it happen.
var server = app.listen(PORT, () => console.log('Server listening on port %d', PORT));
