var Player = require('../react/pages/Player.jsx');

/**
 * This object formalises the socket API for a player,
 * where messages sent to it over a socket by the game
 * server get turned into UI behaviour by the Player.jsx
 * class.
 */
module.exports = {
  bind: function(socket, player) {

    /**
     * Received from the server upon socket connection.
     */
    socket.on('connected', data => {
      var playerid = data.playerid;
      var gameid = window.location.search.match(/gameid=(\d+)/)[1];
      player.log("joining game", gameid);
      player.setState({ playerid }, () => {
        // respond with request to join a specific game.
        socket.emit("join", { playerid, gameid });
      });
    });

    /**
     * Received from the server upon joining a game.
     */
    socket.on('joined', data => {
      var gameid = data.gameid;
      var playerposition = data.pos;
      player.log("joined game", gameid,"with position",playerposition);
      player.setState({ gameid });
    });

    /**
     * Received from the server when a game is ready to start.
     */
    socket.on('ready', data => {
      var gameid = data.gameid;
      var handid = data.handid;
      var playerposition = data.playerposition;
      player.log("starting game", gameid);
      player.setState({ handid, playerposition });
    });

    /**
     * Received from the server upon joining a game.
     */
    socket.on('sethand', data => {
      var tiles = data.tiles;
      tiles.sort((a,b) => a - b);
      player.log("received", tiles.join(','));
      player.setInitialTiles(tiles, () => {
        // respond with a request to verify this player's tiles
        socket.emit("synchronize", { hash: player.getHash() });
      });
    });

    /**
     * Received from the server in response to a request for
     * a compensation tile (either due to drawing a bouns tile
     * or forming a kong)
     */
    socket.on('compensation', data => {
      var tiles = data.tiles;
      player.log("received compensation", tiles.join(','));
      player.addCompensationTiles(tiles);
    });

    /**
     * Received from the server when another player receives
     * a compensation tile due to bonus tiles.
     */
    socket.on('compensated', data => {
      var playerposition = data.playerposition;
      var tiles = data.tiles;
      player.log("player",playerposition,"received compensation for",tiles);
    });

    /**
     * Received from the server to represent a drawing
     * of a tile by this player.
     */
    socket.on('tile', data => {
      var tile = data.tile;
      var playerid = data.playerid;
      player.log("received tile", tile);
      player.addTile(tile);
    });

    /**
     * Received from the server to inform the player that another
     * player drew a tile and is now deciding what to do.
     */
    socket.on('drew', data => {
      player.log("player", data.player, "received tile");
      player.setState({ discard: false });
    });

    /**
     * Received from the server whenever another player discards a tile.
     */
    socket.on('discard', data => {
      var tile = data.tile;
      var pos = data.playerposition;
      player.log("saw discard of tile", tile,"by player",pos);
      player.setState({ discard: tile, discardPlayer: pos });
    });

    /**
     * Received from the server when a discard claim attempt sent by
     * this player is declined by the server (either because the claim
     * itself is bad, or because another player had a better claim).
     */
    socket.on('declined', data => {
      player.log("claim for", data.tile, "("+data.claimType+")", "was declined");
    });

    /**
     * Received from the server when a discard claim attempt is honoured.
     */
    socket.on('accepted', data => {
      var tile = data.tile;
      player.processClaim(data.tile, data.claimType);
    });

    /**
     * Received from the server when another player claims a discard.
     */
    socket.on('claimed', data => {
      player.setState({
        discard: false
      });
    });

    /**
     * Received from the server when another player reveals a claimed set.
     */
    socket.on('revealed', data => {
      var playerpos = data.playerposition;
      var set = data.set;
      player.log("player",playerpos,"played",set);
    });

    /**
     * End of a round, round ended in a draw.
     */
    socket.on('finish:draw', data => {
      player.log("hand was a draw...");
      player.setState({ mode: Player.HAND_OVER, discard: false });
    });

    /**
     * End of a round, round ended in a win by a player.
     */
    socket.on('finish:win', data => {
      player.log("hand was a won by", data.player);
      player.setState({ mode: Player.HAND_OVER, discard: false });
    });

    /**
     * Verification results
     */
    socket.on('verification', data => { player.log("verification:",data.result); });

  }
};
