module.exports = function() {
  var id = Array.from(arguments).join(' ');
  return function() {
    var msg = Array.from(arguments).join(' ');
    console.log(`[${id}] ${msg}`);
  };
};
