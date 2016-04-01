/**
 * Custom events
 */
window.on = function(eventName, eventHandler) {
  if(!window["event handlers"]) { window["event handlers"] = {}; }
  if(!window["event handlers"][eventName]) { window["event handlers"][eventName] = []; }
  window["event handlers"][eventName].push(eventHandler);
};

/**
 * Custom event handling
 */
window.trigger = function(eventName, eventObject) {
  if(!window["event handlers"]) return;
  if(!window["event handlers"][eventName]) return;
  window["event handlers"][eventName].forEach(function(fn) { fn(eventObject); });
};
