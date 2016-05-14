'use strict';

class Connector {
  constructor(sendPortInformation) {
    this.queue = [];
    this.ready = false;

    var server = require('http').createServer(this.callHandler);
    var io = require('socket.io')(server);
    server.listen(() => {
      this.port = server.address().port;
      if (sendPortInformation) {
        sendPortInformation(this.port);
      }
    });
    io.on('connection', socket => this.setSocket(socket));
  }

  setSocket(socket) {
    this.socket = socket;

    socket.on('error', () => {
      console.error("Something went horribly wrong...")
      console.error(arguments);
    });

    console.log('socket on port ${this.port} established.');
    this.ready = true;
    while(this.queue.length) {
      let entry = this.queue.splice(0,1)[0];
      this[entry.op](entry.eventName, entry.handler || entry.payload);
    }
  }

  // subscribe to this connector
  subscribe(eventName, handler) {
    if (!this.ready) {
      return this.queue.push({op: 'subscribe', eventName, handler });
    }
    this.socket.on(eventName, handler);
  }

  // publish to this connector
  publish(eventName, payload) {
    if (!this.ready) {
      return this.queue.push({op: 'publish', eventName, payload });
    }
    this.socket.emit(eventName, payload);
  }

  // unsubscript from this connector
  unsubscribe(eventName, handler) {
    if (!this.ready) {
      return this.queue.push({op: 'unsubscribe', eventName, handler });
    }
    this.socket.removeListener(eventName, handler);
  }
};

module.exports = Connector;
