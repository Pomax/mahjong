(function() {
  var link = document.getElementById('stylesheet');
  setInterval(() => {
    link.href = "css/style.css?" + Math.random();
  }, 1000);
}());
