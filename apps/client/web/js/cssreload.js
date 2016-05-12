(function() {
  var link = document.getElementById('stylesheet');
  var parent = link.parentNode;

  setInterval(() => {
    var newLink = document.createElement('link');
    newLink.setAttribute("rel", "stylesheet");
    newLink.setAttribute("href", "css/style.css?" + Date.now());
    parent.appendChild(newLink);
    parent.removeChild(link);

    link = newLink;
    link.setAttribute("id", "stylesheet");
  }, 1000);

}());
