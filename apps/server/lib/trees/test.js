Tree = require('./');

var n = new Tree({a:1,b:2}),
    n2 = n.add({a:2,b:2}),
    n3 = n2.add({a:3,b:2})
    n4 = n.add({a:9,b:9}),
    n5 = n4.add({d:1,g:2}),
    serialized = n.toJSON(),
    reconstituted = new Tree(JSON.parse(serialized)),
    test = 1,
    result = false,
    fails = 0;
    check = function(v) {
      if (!v) {
        console.error("test",test,"failed");
        fails++;
      }
      test++;
    };

result = n.find({a:3});
check(result === n3);

result = n.find({b:2});
check(result === n);

result = n.find({a:2, b:2});
check(result === n2);

result = n.find({a:'cat'});
check(!result);

result = n.find({c:'d'});
check(!result);

result = serialized === reconstituted.toJSON();
check(result);


var it = n.getIterator();

var expected = [
  { a: 1, b: 2 },
  { a: 2, b: 2 },
  { a: 3, b: 2 },
  { a: 9, b: 9 },
  { d: 1, g: 2 }
];

while(it.hasNext()) {
  var node = it.next();
  result = node.matches(expected.splice(0,1)[0]);
  check(result);
}

if(fails>0) { process.exit(1); }
