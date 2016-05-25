'use strict';

var io = require('socket.io-client');
var Connector = require('./connector');

/**
 * Connector for game clients.
 */
class Client extends Connector {
  /**
   * create a connector on a specific port.
   */
  constructor(owner, postBootstrapHandler, port) {
    super(owner, postBootstrapHandler, port);
  }

  /**
   * bootstrap the connector using the socket.io client library.
   */
  bootstrap(postBootstrapHandler, port) {
    var address = "http://localhost:" + port;
    var socket = this.socket = io.connect(address);
    this.setSocket(socket);
    postBootstrapHandler(this);
  }
}

module.exports = Client;
