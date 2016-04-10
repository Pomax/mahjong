/**
 * A basic tree implementation. Without any specific insertion
 * algorithm specified, this Tree is a simple local insert,
 * depth-first
 */
function Tree(value, allowIndirectManipulation) {
  // we allow for indirect data manipulation.
  this.value = allowIndirectManipulation ? value : JSON.parse(JSON.stringify(value));
  this.parent = false;
  this.children = [];
  if (this.value.__children) {
    // Also note that the ".__children" value gets removed,
    // as it is only usable for bootstrapping a full tree.
    this.value.__children.forEach(c => this.add(c));
    delete this.value.__children;
  }
};

Tree.prototype = {
  /**
   * Add a child tree to this tree at this node.
   *
   * If a different insertion rule is needed, pass in your
   * own insertion algorithm to effect a different kind of
   * tree.
   */
  add: function(value, insert) {
    var n = new Tree(value);
    if (insert) {
      // insertion format: function(Tree, Node) -> Node
      return insert(this, n);
    }
    this.children.push(n);
    n.parent = this;
    return n;
  },

  /**
   * Remove a child node from the tree (examined depth-first).
   *
   * If someone wants to implement a "bf" flag that switches
   * this to breadth-first, I will be happy to merge that in.
   */
  remove: function(n, bf) {
    var c = this.children;
    if (c.length===0) return false;
    var pos = c.indexOf(n);
    if (pos>-1) {
      this.children.splice(pos,1);
      return true;
    }
    // early return
    return c.some(ch => ch.remove(n));
  },

  /**
   * Find a node based on one (or more) key/value pairs, depth-first.
   *
   * If someone wants to implement a "bf" flag that switches
   * this to breadth-first, I will be happy to merge that in.
   */
  find: function(keyValueObj) {
    if (this.matches(keyValueObj)) return this;
    c = this.children;
    // ensure early return
    for (var i=0, r; i<c.length; i++) {
      r = c[i].find(keyValueObj);
      if (r) return r;
    }
    return false;
  },

  /**
   * See if this node matches the target set of key/value pairs.
   */
  matches: function(keyValueObj, undef) {
    var keys = Object.keys(keyValueObj);
    for(var i=0; i<keys.length; i++) {
      // two checks, to ensure early return
      var key = keys[i];
      var v = this.value[key];
      if(v === undef) return false;
      if(v !== keyValueObj[key]) return false;
    };
    return true;
  },

  /**
   * Base JS object function; the value of a tree is the tree itself.
   */
  valueOf: function() {
    return this;
  },

  /**
   * String representation of this tree. We go with JSON formatting.
   */
  toString: function() {
    return this.toJSON();
  },

  /**
   * A sometimes more code-relevant alias for toString().
   */
  serialize: function() {
    return this.toJSON();
  },

  /**
   * JSON representation of this tree.
   *
   * This function pairs idempotently with the constructor such
   * that "new Tree(oldTree.toJSON())" is equivalent to "oldTree".
   */
  toJSON: function(undef) {
    var v = this.value || undef;
    var blocks = [];
    v = JSON.stringify(v);
    blocks.push(v.substring(0,v.length-1));
    var cblocks = this.children.map(c => c.toJSON());
    if (cblocks.length > 0) {
      blocks = blocks.concat([',"__children":[']).concat(cblocks.join(',')).concat([']']);
    }
    blocks.push('}')
    return blocks.join('');
  },

  /**
   * Generate all paths from the root to each of the leaves, yielding
   * a set (array) of paths (array of node values at each step).
   */
  getAllValuePaths: function(sofar, seen) {
    seen = seen || [];
    var base = sofar? sofar.slice() : [];
    if(this.value) { base.push(this.value); }
    if (this.children.length===0) { seen.push(base); }
    this.children.map(c => { c.getDistinctPaths(base, seen); });
    return seen;
  },

  /**
   * Iterator functionality, for while(next) code, depth-first.
   *
   * If someone wants to implement a "bf" flag that switches
   * this to breadth-first, I will be happy to merge that in.
   */
  getIterator: function() {
    return new Iterator(this);
  },

  /**
   * "find next" function used for iterating over this tree.
   */
  __nextIterationTarget: function(n) {
    var pos = this.children.indexOf(n);
    if (pos===-1) {
    }
    if (pos+1<this.children.length) {
      return this.children[pos+1];
    }
    if (!this.parent) { return false; }
    return this.parent.__nextIterationTarget(this);
  }
};

/**
 * A simple iterator
 */
var Iterator = function(root) {
  this.node = root;
};

/**
 * Iterator API implements "hasNext()" => truth value,
 * and "next()" => next node in the iteration.
 */
Iterator.prototype = {
  hasNext: function() {
    return (this.node!==false);
  },
  next: function() {
    var n = this.node;
    if (n===false) return false;
    var _ret = n;
    this.node = (n.children.length>0) ? n.children[0] : n.parent.__nextIterationTarget(n);
    return _ret;
  }
}

module.exports = Tree;
