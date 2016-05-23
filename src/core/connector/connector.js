'use strict';

var debug = false;

/**
 * A socket wrapper that lets us swap in different socket libraries,
 */
class Connector {
  constructor(postBootstrapHandler, port) {
    this.queue = [];
    this.ready = false;
    this.port = port || false;
    this.bootstrap(postBootstrapHandler, port);
  }

  /**
   * bootstrap the connector
   */
  bootstrap(postBootstrapHandler, port) {
    // client/server extensions implement this differently.
  }

  /**
   * Bind the socket, and resolve any outstanding operations
   * that had been queued before the socket was properly ready.
   */
  setSocket(socket) {
    this.socket = socket;

    // socket.on('error', (e) => {
    //   console.error("Something went horribly wrong...")
    //   console.error(e);
    //   console.trace();
    // });

    if (debug) console.log('socket on port ${this.port} established.');
    this.ready = true;
    while(this.queue.length) {
      let entry = this.queue.splice(0,1)[0];
      this[entry.op](entry.eventName, entry.handler || entry.payload, entry.afterwards);
    }
  }

  /**
   * subscribe to this connector
   */
  subscribe(eventName, handler) {
    if (!this.ready) {
      return this.queue.push({op: 'subscribe', eventName, handler });
    }
    this.socket.on(eventName, handler);
  }

  /**
   * publish over this connector
   */
  publish(eventName, payload, afterwards) {
    if (!this.ready) {
      return this.queue.push({op: 'publish', eventName, payload, afterwards });
    }
    this.socket.emit(eventName, payload);
    if (afterwards) afterwards();
  }

  /**
   * unsubscripe from this connector
   */
  unsubscribe(eventName, handler) {
    if (!this.ready) {
      return this.queue.push({op: 'unsubscribe', eventName, handler });
    }
    this.socket.removeListener(eventName, handler);
  }
}

module.exports = Connector;
