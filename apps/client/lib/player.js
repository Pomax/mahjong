(function() {

  function log() {
    var msg = Array.from(arguments).join(' ');
    var p = document.createElement('p');
    p.textContent = msg;
    document.body.appendChild(p);
  }

  var socket = io.connect('http://localhost:8081');
  var playerid;

  socket.on('connected', function (data) {
    playerid = data.playerid;
    var gameid = window.location.search.match(/gameid=(\d+)/)[1];
    log("joining game", gameid);
    socket.emit("join", {
      playerid: playerid,
      gameid: gameid
    });
  });

  socket.on('joined', function (data) {
    var gameid = data.gameid;
    log("joined game", gameid);
  });

  socket.on('ready', function(data) {
    var gameid = data.gameid;
    log("starting game", gameid);
  });

  socket.on('sethand', function(data) {
    var tiles = data.tiles;
    log(tiles.map(t => t.tileNumber).sort());
  });

  // player received a tile to play with
  socket.on('tile', function(data) {
    log("received tile", data.tile.tileNumber);
  });

  // another player received a tile to play with
  socket.on('drew', function(data) {
    log("player", data.player, "received tile");
  });

}());
