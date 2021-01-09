const matrix = {
    pair:  [ 'simples', 'terminals', 'winds', 'winds (maj)', 'dragons' ],
    sets: [
        // chows
        'chow.1',     'chow.2',     'chow.3',     'chow.4',
        // pungs
        'pung:simple.1',     'pung:simple.2',     'pung:simple.3',     'pung:simple.4',
        'pung:terminal.1',   'pung:terminal.2',   'pung:terminal.3',   'pung:terminal.4',
        'pung:wind.1', 'pung:wind.2', 'pung:wind.3', 'pung:wind.4',
        'pung:wind (maj).1', 'pung:wind (maj).2', 'pung:wind (maj).3', 'pung:wind (maj).4',
        'pung:dragon.1',     'pung:dragon.2',     'pung:dragon.3',
        //kongs
        'kong:simple.1',     'kong:simple.2',     'kong:simple.3',     'kong:simple.4',
        'kong:terminal.1',   'kong:terminal.2',   'kong:terminal.3',   'kong:terminal.4',
        'kong:wind.1', 'kong:wind.2', 'kong:wind.3', 'kong:wind.4',
        'kong:wind (maj).1', 'kong:wind (maj).2', 'kong:wind (maj).3', 'kong:wind (maj).4',
        'kong:dragon.1',     'kong:dragon.2',     'kong:dragon.3'
    ]
};

function filter(list) {
    return list.filter((v,pos) => list.indexOf(v)===pos);
}

function generateHands() {
    let hands = [];
    let dragonCount =  0;
    matrix.pair.forEach(pair => {
        if (pair.indexOf('dragon')>-1) dragonCount++;
        let base = matrix.sets.slice();
        base.forEach(set1 => {
            if (set1.indexOf('dragon')>-1) dragonCount++;
            base.slice(base.indexOf(set1) + 1).forEach(set2 => {
                if (set2.indexOf('dragon')>-1) dragonCount++;
                base.slice(base.indexOf(set2) + 1).forEach(set3 => {
                    if (set3.indexOf('dragon')>-1) {
                        if (dragonCount === 3) return; // we can only ever have 3 dragons
                        dragonCount++;
                    }
                    base.slice(base.indexOf(set3) + 1).forEach(set4 => {
                        if (set4.indexOf('dragon')>-1) {
                            if (dragonCount === 3) return; // we can only ever have 3 dragons
                            dragonCount++;
                        }
                        let hand = [pair, set1, set2, set3, set4];
                        let print = hand.map(v => v.replace(/\.\d/,'')).join(', ');
                        hands.push(print);
                        if (set4.indexOf('dragon')>-1) dragonCount--;
                    });
                    if (set3.indexOf('dragon')>-1) dragonCount--;
                });
                if (set2.indexOf('dragon')>-1) dragonCount--;
            });
            if (set1.indexOf('dragon')>-1) dragonCount--;
        });
        if (pair.indexOf('dragon')>-1) dragonCount--;
    });

    // remove numbering and collapse lists to single string prints for sorting.
    hands = hands.sort();

    // remove duplicates by simply creating a new list with uniques.
    let filtered = [];
    for (let i=1, c=hands[0], n; i<hands.length; i++) {
        n = hands[i];
        if (c!==n) {
            filtered.push(c); c = n;
        }
    }

    return filtered;
}

let totalHands = generateHands();

console.log(totalHands.length);
console.log(totalHands.slice(0,100));
