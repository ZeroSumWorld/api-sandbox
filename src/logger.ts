import logger from "node-color-log";


namespace Logger {
    export let lastMessage: string = "";

    //@ts-ignore
    function composeMessage(...args) {
        lastMessage = "";
        args.forEach((args) => {
            lastMessage += args.toString()+" ";
        });
    }

    //@ts-ignore
    export function debug(...args) {
        composeMessage(...args);
        logger.debug(...args);
    }

    //@ts-ignore
    export function success(...args) {
        composeMessage(...args);
        logger.info(...args);
    }

    //@ts-ignore
    export function warn(...args) {
        composeMessage(...args);
        logger.warn(...args);
    }

    //@ts-ignore
    export function error(...args) {
        composeMessage(...args);
        logger.error(...args);
    }
}

export default Logger;