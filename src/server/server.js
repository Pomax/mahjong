/**
 * This is a simple express server that acts as mediator between clients and the mahjong manager,
 * by exposing URLs that effect game logic such as joining the ecosystem, starting games, etc.
 */
'use strict'

require('../lib/fix');

var fs = require('fs');
var path = require('path');
var express = require('express');
var request = require('superagent');
var Manager = require('../core/manager');
var getRandomAnimal = require('../lib/names');

var habitat = require('habitat');
habitat.load(path.join(__dirname, ".env"));
var PORT = process.env.PORT || 8081;
var HOST = process.env.HOST || "http://localhost";
if (PORT !== 80 && HOST.indexOf(':') === -1) { HOST += ':' + PORT; }

var app = express();
var gm = new Manager();
var Bot = require('../client/basic/client');

// add a bot to a game.
function addBot(game) {
  var name = getRandomAnimal();
  gm.createPlayer({ name }, (id, uuid, port, player) => {
    new Bot(name, uuid, port, () => gm.joinPlayerToGame(game.id, id, uuid));
  });
}

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
app.get('/register/:name/:uuid', (req, res) => {
  let options = {
    name: req.params.name,
    uuid: req.params.uuid
  };
  gm.createPlayer(options, (id, uuid, port, player) => {
    console.log("createplayer response for", player.name);
    res.json({ id, uuid, port });
  });
});

// start a new single-player game
app.get('/game/single/:id/:uuid', (req, res) => {
  var playerid = req.params.id;
  var uuid = req.params.uuid;
  var game = gm.createGame('minimal');
  game.addPlayer(gm.getPlayer(playerid));
  [1,2,3].forEach(id => addBot(game));
  res.json({ status: "created" });
});

// start a new regular game and join the requesting player to it
app.get('/game/new/:id/:uuid', (req, res) => {
  var playerid = req.params.id;
  var uuid = req.params.uuid;
  var game = gm.createGame('minimal');
  gm.joinPlayerToGame(game.id, playerid);
  res.json({ status: "created", gameid: game.id });
});

// join a player to the game
app.get('/game/join/:gameid/:playerid/:uuid', (req, res) => {
  var success = gm.joinPlayerToGame(req.params.gameid, req.params.playerid, req.params.uuid);
  if (success) {
    res.json({ status: "joined" });
    // Note that if the game joined worked and this was
    // the fourth player, a game will start, an negotiation
    // happens via the websockets for each player.
  } else {
    res.status(403).json({ status: "error", error: "could not add player to this game." });
  }
});

// join a bot to a game this player 'owns'
app.get('/game/addbot/:gameid/:playerid/:uuid', (req, res) => {
  var gameid = req.params.gameid;
  var playerid = req.params.playerid;
  var uuid = req.params.uuid;
  var game = gm.getGame(gameid);
  var player = gm.getPlayer(playerid);
  if (game.owningPlayer !== player) {
    return res.status(403).json({ status: "error", error: "Request issued by player other than game owner" })
  }
  addBot(game);
  res.json({ status: "bot added" });
});

/**
 * I really wish we could go back in time and murder
 * everyone who suggested we add CORS to browsers.
 * It took away freedom on the web and my hatred
 * over that decision-without-veto knows no bounds.
 */
app.get('/thumb/:animal', (req, res) => {
  var search = [
    "action=query",
    "titles=" + req.params.animal,
    "prop=pageimages",
    "format=json",
    "pithumbsize=100",
    "redirects",
    "callback=?"
  ].join('&');
  var url = "https://en.wikipedia.org/w/api.php?" + search;
  request.get(url).end(function(err, data) {
    var src = '/images/unknown-thumb.png';
    var text = data.text;
    if (!text) return res.json(src);
    var json = text.replace('/**/(','').replace(/\)$/,'');
    if (!json) return res.json(src);
    var obj;
    try { obj = JSON.parse(json); } catch(e) { }
    if (!obj) return res.json(src);
    var query = obj.query.pages;
    if (!query) return res.json(src);
    var key = Object.keys(query)[0];
    if (!key) return res.json(src);
    var article = query[key];
    if (!article) return res.json(src);
    var thumbnail = article.thumbnail;
    if (!thumbnail) return res.json(src);
    // Jesus H. Christ on a bike, can we make it any harder to just get a goddamn wikipedia thumbnail?
    src = thumbnail.source;
    res.json(src);
  });
});

// make it happen.
var server = app.listen(PORT, () => console.log('Server listening on port %d', PORT));
