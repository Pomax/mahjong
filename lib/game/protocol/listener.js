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
        parseInt(data.gameid),
        parseInt(data.playerid),
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
        parseInt(data.playerposition),
        parseInt(data.tile)
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
        parseInt(data.playerid),
        parseInt(data.playerposition),
        parseInt(data.tile),
        parseInt(data.claimType),
        parseInt(data.winType)
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
        parseInt(data.playerid),
        parseInt(data.playerposition),
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
        parseInt(data.playerposition),
        data.set,
        data.concealed
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
        parseInt(data.playerposition),
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
      handler.handleConfirmed.bind(handler)(
        parseInt(data.playerposition)
      );
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
  },

  /**
   * Called by a player when they want to declare a concealed kong.
   */
  kongDeclaration(handler) {
    this.socket.on("claim:concealedkong", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleKongDeclaration.bind(handler)(
        parseInt(data.playerposition),
        parseInt(data.tile)
      );
    });
  },

  /**
   * A player thinks they can win. Process that claim.
   */
  winDeclaration(handler) {
    this.socket.on("declare:win", (data) => {
      if (this.fails(data, handler.mustMatch)) return;
      handler.handleWinDeclaration.bind(handler)(
        parseInt(data.playerposition)
      );
    });
  }

};

module.exports = Listener;
