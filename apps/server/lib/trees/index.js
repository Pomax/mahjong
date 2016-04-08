/**
 * Basic tree implementation.
 */
function Tree(value) {
  this.value = value || false;
  this.parent = false;
  this.children = [];
};

Tree.prototype = {
  // add a child tree to this tree
  add: function(value) {
    var n = new Tree(value);
    this.children.push(n);
    n.parent = this;
    return n;
  },
  // the value of a tree is the tree itself
  valueOf: function() {
    return this;
  },
  // list-style string representation of this tree
  toString: function() {
    var blocks = [];
    if (this.value) { blocks.push(this.value); }
    var cblocks = this.children.map(c => c.toString());
    if (cblocks.length > 0) { blocks = blocks.concat(cblocks); }
    if (blocks.length > 0) { blocks = ["("].concat(blocks).concat([")"]); }
    return blocks.join('');
  },
  // generate all paths from the root to each of the leaves.
  getDistinctPaths: function(sofar, seen) {
    seen = seen || [];
    var base = sofar? sofar.slice() : [];
    if(this.value) { base.push(this.value); }
    if (this.children.length===0) { seen.push(base); }
    this.children.map(c => { c.getDistinctPaths(base, seen); });
    return seen;
  }
};

module.exports = Tree;
