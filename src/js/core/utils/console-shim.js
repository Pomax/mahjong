if (typeof process !== "undefined") {
    __console = console;
    config = require("../../../config.js");
}

const consoleProxy = {
    debug(...args) {
        if(config.DEBUG) {  __console.debug(...args); }
    },

    log(...args) {
        __console.log(...args);
    },

    warn(...args) {
        __console.warn(...args);
    },

    error(...args) {
        __console.error(...args);
    },

    trace(...args) {
        __console.trace(...args);
    },
}

if (typeof process !== "undefined") {
    module.exports = consoleProxy;
}
