module.exports = require('pirates').addHook(s => s.replace(/['"]/g, '`').replace(/`use strict`/,"'use strict'"), { exts: ['.js'], matcher: n => n.indexOf('node_modules')<0 });
