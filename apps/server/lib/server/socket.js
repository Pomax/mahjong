module.exports = function(server) {
  var io = require('socket.io').listen(server);
  var gameManager = require('../game/game-manager');

  // socket.io protocol implementation
  io.on('connection', function (socket) {
    var playerid = gameManager.nextPlayerId();
    console.log("created connection for player id "+playerid);

    socket.emit('connected', {
      playerid: playerid
    });

    // player is ready to start a game
    socket.on('join', function (data) {
      var playerid = data.playerid;
      var game = gameManager.getGame(data.gameid);
      game.addPlayer(playerid, socket);

      // ===================================================
      // Game controls the socket behaviour from here on out
      // ===================================================
    });

  });
};
