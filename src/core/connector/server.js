'use strict';

var Connector = require('./connector');

/**
 * Connector for server processes.
 */
class Server extends Connector {
  /**
   * create a connector that will figure out its port later.
   */
  constructor(owner, sendPortInformation) {
    super(owner, sendPortInformation);
  }

  /**
   * bootstrap the connector using the socket.io server library.
   */
  bootstrap(sendPortInformation) {
    var server = require('http').createServer();
    var io = require('socket.io')(server);
    server.listen(() => {
      this.port = server.address().port;
      if (sendPortInformation) {
        sendPortInformation(this.port);
      }
    });
    io.on('connection', socket => this.setSocket(socket));
  }
}

module.exports = Server;
