var Settings = function(id) {
  this.key = "mjls" + (id ? "-" + id : '');
  var data = this.getSavedData();
  if (data) {
    Object.keys(data).forEach(k => this[k] = data[k]);
  }
};

Settings.prototype = {
  getSavedData() {
    var data = localStorage[this.key];
    if (!data) return false;
    return JSON.parse(data);
  },
  saveData() {
    localStorage[this.key] = JSON.stringify(this);
  },
  setName: function(name) {
    this.name = name;
    this.saveData();
  },
  setUUID: function(uuid) {
    this.uuid = uuid;
    this.saveData();
  }
};

module.exports = Settings;
