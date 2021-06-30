import { config } from "../../../config.js";

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

export { playlog };
