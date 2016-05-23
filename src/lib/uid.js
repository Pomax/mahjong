module.exports = function() {
  return (function() {
    var uid = 0;
    return () => uid++;
  }());
};
