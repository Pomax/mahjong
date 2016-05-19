'use strict';

// Expose both the Client and Server, but not the base class.
module.exports = {
  Client: require('./client'),
  Server: require('./server')
};
