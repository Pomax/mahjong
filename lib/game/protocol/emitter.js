/**
 * This object models the server->client part
 * of the client/server protocol.
 */

Emitter = function(socket) {
  this.socket = socket;
};

Emitter.prototype = {
  send(msg, payload) {
    this.socket.emit(msg, payload);
  },

  /**
   * A client has been connected to the server.
   */
  connected(playerid) {
    this.send('connected', { playerid });
  },

  /**
   * A client has been joined to a game.
   */
  joined(gameid, playerid, playerposition) {
    this.send("joined", { gameid, playerid, playerposition });
  }

};

module.exports = Emitter;
