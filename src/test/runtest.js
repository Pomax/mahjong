// server setup
'use strict'

var Client = require('../client/basic/client');
var Manager = require('../core/manager');

var gm = new Manager();
var game = gm.createGame('minimal');

var players = [0,1,2,3].map(id => gm.createPlayer({ name: 'player ${id}' }, port => {
  new Client(players[id].name, port, () => game.addPlayer(players[id]));
}));
