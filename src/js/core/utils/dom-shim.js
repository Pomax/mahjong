// fake CSS manager
class Style {
  constructor() {
    this.properties = {};
  }
  setProperty(name,value) {
    this.properties[name] = value;
  }
}

// fake HTML element class list
class Classlist {
  constructor() { this.classes = []; }
  add(v) { if (this.classes.indexOf(v)===-1) this.classes.push(v); }
  remove(v) { let pos = this.classes.indexOf(v); if (pos>-1) this.classes.splice(pos,1); }
  toggle(v) { if (this.contains(v)) this.remove(v); else this.add(v); }
  contains(v) { return this.classes.indexOf(v)>-1; }
  copy() {
    let cl = new Classlist();
    cl.classes = this.classes.slice();
    return cl;
  }
}

// fake HTML element
class Element {
  constructor(tag, namespace) {
    this.nodeName = tag.toUpperCase();
    this.namespace = namespace;
    this.classList = new Classlist();
    this.dataset = {};
    this.attributes = {};
    this.children = [];
    this.events = {};
    this.parentNode = false;
    this.style = new Style();
    this.innerHTML = ``;
  }

  focus() { /* irrelevant */ }
  setAttribute(a,v) { this.attributes[a] = v; }
  removeAttribute(a) { delete this.attributes[a]; }

  querySelector(qs) { return new Element('div'); }
  querySelectorAll(qs) { return [ new Element('div') ]; }

  appendChild(e) { this.children.push(e); e.parentNode = this; }
  append(e) { this.appendChild(e); }
  removeChild(e) { let pos = this.children.indexOf(e); if (pos>-1) this.children.splice(pos,1); }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }

  addEventListener(evtName, fn, priority) {
    if (!this.events[evtName]) this.events[evtName] = [];
    if (priority) this.events[evtName].unshift(fn);
    else this.events[evtName].push(fn);
  }

  removeEventListener(evtName, fn, priority) {
    let bin = this.events[evtName];
    let pos = bin ? bin.indexOf(fn) : -1;
    if (pos > -1) this.events[evtName].splice(pos, 1);
  }

  play() { /* ... */ }

  click() {
    let evt = { target: this };
    let bin = this.events["click"];
    if (bin) bin.forEach(fn => fn(evt));
  }

};

// fake DOM
class Document {
  constructor() {
    this.body = new Element('body');
    this.children = [ this.body];
  }
  createElement(tag, namespace) { return new Element(tag, namespace); }
  addEventListener(evtName, fn, priority) { /* ... */ }
  removeEventListener(evtName, fn, priority) { /* ... */ }
  querySelector(qs) { return this.body.querySelector(qs); }
  querySelectorAll(qs) {
    // That's right: we're shimming individual query selectors.
    if (qs === '.player-wind') {
      return [0,1,2,3].map(e => new Element('div'));
    }
    throw new Error(`unknown queryselector: ${qs}\n`);
  }
}

if (typeof process !== "undefined") {
  module.exports = {
    document: new Document(),
    Element,
    Classlist
  };
}
