'use strict'

var Constants = require('./system/game/constants');

/**
 * A very simple test client that implements game protocol and knows how
 * to play pungs, and how to call a win if they only have one tile left.
 */
module.exports = {
  createClient: function(player, port, afterBinding) {

    console.log('connecting to port ${port}...');
    var io = require('socket.io-client');
    var socket = io.connect('http://localhost:${port}');

    var currentGame = {};
    var testTiles = [];
    var bonusTiles = [];
    var revealedSets = [];

    socket.on('connect', data => {

      /**
       * used by all protocol steps that involve "getting a tile"
       */
      function checkBonus() {
        var bonus = testTiles.filter(t => t >= Constants.PLAYTILES);
        if (bonus.length > 0) {
          bonusTiles = bonusTiles.concat(bonus);
          testTiles = testTiles.filter(t => t < Constants.PLAYTILES);
          console.log("requesting compensation for bonus tiles ${bonus}");
        }
        socket.emit("bonus-request", { tiles: bonus });
      }

      /**
       * used by all protocol steps that involve "discarding a tile"
       */
      function discardTile(cleandeal) {
        // have we won?
        if (testTiles.length === 0) {
          return socket.emit("discard-tile", { tile: Constants.NOTILE });
        }
        // have we won "self-drawn"?
        if (testTiles.length === 2 && testTiles[0] == testTiles[1]) {
          return socket.emit("discard-tile", { tile: Constants.NOTILE, selfdrawn: !!cleandeal });
        }
        // okay, we have not won. Pick a decent discard tile.
        var tile = parseInt(getTileForStrategy(2));
        var pos = testTiles.indexOf(tile);
        testTiles.splice(pos,1);
        console.log("discarding: ", tile);
        socket.emit("discard-tile", { tile });
      }

      /**
       * discard strategies for test purposes
       */
      function getTileForStrategy(strategy) {
        var pos, tile;

        // two very dumb strategies:
        if (strategy === 0) {
          tile = testTiles[0]
        }

        if (strategy === 1) {
          pos = (testTiles.length * Math.random())|0;
          tile = testTiles[pos];
        }

        // a slightly better strategy: throw out things that aren't pairs.
        if (strategy === 2) {
          var tiles = {};
          testTiles.forEach(t => { if (!tiles[t]) tiles[t] = 0; tiles[t]++; });
          tiles = Object.keys(tiles).filter(t => tiles[t]===1);
          // make sure we discard _something_ even if we have no singles:
          if (tiles.length === 0) { tiles = testTiles; }
          pos = (tiles.length * Math.random())|0;
          tile = tiles[pos];
        }

        return tile;
      }

      console.log('connected on port ${port}');

      socket.on('getready', data => {
        console.log("instructed to get ready by the server on ${port}");
        console.log(data);
        currentGame = data;
        testTiles = [];
        bonusTiles = [];
        revealedSets = [];
        socket.emit("ready");
      });

      socket.on('initial-tiles', data => {
        console.log("initial tiles for this player: ", data.tiles);
        testTiles = data.tiles.map(v => parseInt(v));
        checkBonus()
      });

      socket.on('bonus-compensation', data => {
        console.log("bonus compensation tiles for this player: ", data.tiles);
        testTiles = testTiles.concat(data.tiles.map(v => parseInt(v)));
        checkBonus()
      })

      socket.on('turn-tile', data => {
        console.log("received turn tile: ", data.tile);
        testTiles.push(parseInt(data.tile));
        discardTile(true);
      });

      socket.on('tile-discarded', data => {
        var from = data.from;
        var tile = parseInt(data.tile);
        // can we win?
        if (testTiles.length === 1 && testTiles[0] == tile) {
          return socket.emit("claim-discard", { claimType: Constants.WIN, winType: Constants.PAIR });
        }
        // can we form a pung?
        var filtered = testTiles.filter(t => t===tile);
        if (filtered.length === 2) {
          console.log("player ${currentGame.position} claims pung");
          socket.emit("claim-discard", { claimType: Constants.PUNG });
        } else {
          socket.emit("claim-discard", { claimType: Constants.NOTHING });
        }
      });

      socket.on('claim-awarded', data => {
        console.log("player ${currentGame.position} was allowed to form a ${Constants.setNames[data.claim.claimType]}");
        var tile = parseInt(data.tile);
        var remove = (data.claim.claimType === Constants.WIN) ? [tile] : [tile, tile];
        remove.forEach(t => {
          let pos = testTiles.indexOf(t);
          testTiles.splice(pos,1);
        })
        var tiles = remove.concat([tile]);
        revealedSets.push(tiles);
        socket.emit("set-revealed", { tiles });
      });

      socket.on('player-revealed', data => {
        if (data.from == currentGame.position) {
          console.log("discarding from",testTiles,"after a claim");
          discardTile()
        }
      });

      socket.on('player-revealed-bonus', data => {
        //var seat = data.by;
        //var tiles = data.tiles.map(v => parseInt(v));
        //console.log("saw player in seat ${seat} reveal bonus tile(s) ${tiles}");
      });

      socket.on('hand-drawn', data => {
        console.log("${player.name} in seat ${currentGame.position} registered that the hand was a draw.");
        console.log('  tiles:', testTiles);
        console.log('  bonus', bonusTiles);
        console.log('  on the table', revealedSets);
        socket.emit('hand-acknowledged');
      });

      socket.on('hand-won', data => {
        console.log(data);
        var selfdrawn = data.selfdrawn ? "(self-drawn) " : '';
        console.log("${player.name} in seat ${currentGame.position} registered that the hand was won ${selfdrawn}by player in seat ${data.winner}.");
        console.log('  tiles:', testTiles);
        console.log('  bonus', bonusTiles);
        console.log('  on the table', revealedSets);
        socket.emit('hand-acknowledged');
      });

    });

    afterBinding();
  }
};
