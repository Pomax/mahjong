/**
 * This object models the client->server part
 * of the client/server protocol.
 */

Listener = function(socket, securities) {
  this.socket = socket;
  this.securities = securities;
};

Listener.prototype = {
  // test function
  fails(data, keys, ignore) {
    ignore = ignore || [];
    var failed = keys.some(key => ignore.indexOf(key)>-1 ? false : this.securities[key]!==data[key]);
    if (failed) {
      console.error("mismatch between",this.securities,"and",data);
      console.trace();
    }
    return failed;
  },

  // when players rotate we need to update the securities.
  updateSecurities(securities) {
    this.securities = securities;
  },

  /**
   * A client wants to join the server.
   *
   * for integrity, payload must contain [playerid]
   */
  join(handler) {
    this.socket.on('join', (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleJoin.bind(handler)(
        data.gameid,
        data.playerid,
        this.socket
      );
    });
  },

  /**
   * A client is discarding a tile.
   *
   * for integrity, payload must contain [gameid,handid,playerid,playerposition]
   */
  discard(handler) {
    this.socket.on("discard", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleDiscard.bind(handler)(
        data.playerposition,
        data.tile
      );
    });
  },

  /**
   * A client is making a claim on the discard tile
   *
   * for integrity, payload must contain [gameid,handid,playerid,playerposition]
   */
  claim(handler) {
    this.socket.on("claim", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleClaim.bind(handler)(
        data.playerid,
        data.playerposition,
        data.tile,
        data.claimType,
        data.winType
      );
    });
  },

  /**
   * A client needs compensation tiles for bonus tiles taken out of their hand.
   *
   * for integrity, payload must contain [gameid,handid,playerid,playerposition]
   */
  compensate(handler) {
    this.socket.on("compensate", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleCompensate.bind(handler)(
        data.playerid,
        data.playerposition,
        data.tiles
      );
    });
  },

  /**
   * A client is revealing a set that was formed after a claim.
   *
   * for integrity, payload must contain [gameid,handid,playerid,playerposition]
   */
  reveal(handler) {
    this.socket.on("reveal", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleReveal.bind(handler)(
        data.playerposition,
        data.set
      );
    });
  },

  /**
   * A client is requesting a hand verification for correct-code-verification.
   *
   * for integrity, payload must contain [gameid,handid,playerid,playerposition]
   */
  verify(handler) {
    this.socket.on("verify", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleVerify.bind(handler)(
        data.playerposition,
        data.digest,
        data.tiles,
        data.bonus,
        data.revealed
      );
    });
  },

  /**
   * A client is confirming that they are ready to start play on a hand.
   *
   * for integrity, payload must contain [gameid,handid,playerid,playerposition]
   */
  confirm(handler) {
    this.socket.on("confirmed", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleConfirmed.bind(handler)(data.playerposition);
    });
  },

  /**
   * ...
   */
  restartready(handler) {
    this.socket.on("restartready", (data) => {
      if (this.fails(data, handler.mustMatch, ['playerposition'])) return;
      handler.handleRestartReady.bind(handler)();
    });
  }

};

module.exports = Listener;
