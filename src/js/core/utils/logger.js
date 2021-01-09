const playlog = {
    lines: [],
    prefix: () => `${Date.now()}: `,
    log: (text) => {
        if (typeof text !== "string") text = text.toString()
        text.split('\n').forEach(line => {
            playlog.lines.push(`${playlog.prefix()}${line}`);
        });
    },
    flush: () => {
        if (config.WRITE_GAME_LOG) {
            let text = playlog.lines.slice().join('\n');
            playlog.openTab(text);
        }
        playlog.lines = [];
    },
    openTab: (text) => {
        let a = document.createElement(`a`);
        a.target = `_blank`;
        a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
        a.style.display = `none`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
};

if (typeof process !== "undefined") {
    const noop = ()=>{};
    const fs = require('fs');
    const config = require('../../../config');

    let lines = [];
    let prefix = () => ''; // `${Date.now()}: `;

    playlog.flush = (andThen=noop) => {
        if (config.WRITE_GAME_LOG) {
            let data = lines.slice().join('\n');
            fs.writeFile(`play-log-${config.SEED}.log`, data, { flag: 'w', encoding: 'utf-8' }, andThen);
        }
        lines = [];
    };

    playlog.log = (...args) => {
        args.forEach((text,i) => {
            if (typeof text !== "string") text = JSON.stringify(text);
            if (text) {
                text.split('\n').forEach(line => {
                    lines.push(`${prefix()}${line}`);
                });
            }
        })
    };

    process.on('SIGINT', function() {
        playlog.flush(() => {
            process.exit();
        });
    });

    module.exports = playlog;
}
