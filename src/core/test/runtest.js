// server setup
'use strict'

var Client = require('../../client/basic/client');
var Manager = require('../../core/manager');

var gm = new Manager();
var game = gm.createGame('minimal');

[0,1,2,3].map(id => {
  let name = 'player ${id}';
  gm.createPlayer({ name }, (id, uuid, port, player) => {
    new Client(name, uuid, port, () => game.addPlayer(player));
  })
});
