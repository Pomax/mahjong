// server setup
'use strict'

var client = require('./testclient');
var Manager = require('./system/game/manager');

var gm = new Manager();
var game = gm.createGame('minimal');

var players = [0,1,2,3].map(id => gm.createPlayer({ name: 'player ${id}' }, port => {
  client.createClient(players[id], port, () => game.addPlayer(players[id]));
}));

