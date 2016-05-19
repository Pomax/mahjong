'use strict';

var Constants = require('../../../core/constants');
var BaseClient = require('../../basic/client');

/**
 *
 */
class ClientPassThrough extends BaseClient {
  constructor(name, port, afterBinding) {
    super(name, port, afterBinding);
  }

  bindApp(app) { this.app = app; }

  discardTile(cleandeal) {
    this.app.setTiles(
      this.tiles.sort(Constants.sort).slice(),
      this.bonus.sort(Constants.sort).slice(),
      JSON.parse(JSON.stringify(this.revealed))
    );
  }

  discardFromApp(tile) {
    this.processTileDiscardChoide(tile);
  }
}

module.exports = ClientPassThrough;
