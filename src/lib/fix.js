'use strict';
var path = require('path');

/**
 *
 * This shims Node.js so that any string that uses '' quotations
 * instead uses `` quotations. This allows ${var} in normal looking
 * strings instead of the visual nonsense that backticks give us.
 *
 * It also ensures that all of "our" code uses 'use strict' at the
 * top of the file, to make sure all ES6+ features are allowed.
 *
 */
var fixloader = require('./fix-loader');
module.exports = require('pirates').addHook(fixloader, {
  // execute this for .js files only
  exts: ['.js'],
  // and execute this for our own code only
  matcher: n => {
    console.log(n);
    (n.indexOf(path.join('mahjong','src')) > -1)
  }
});
