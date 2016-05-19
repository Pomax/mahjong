module.exports = function(source) {
  // replace ' symbols with ` symbols.
  source = source.replace(/'/g, '`');
  // fix 'use strict' if that was affected.
  source = source.replace(/`use strict`/, "'use strict'");
  // or, if there IS no 'use strict', add it.
  if (!source.match(/use strict/)) {
    source = "'use strict';\n\n" + source;
  }
  console.log(source);
  return source;
};
