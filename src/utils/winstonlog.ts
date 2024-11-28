const winston = require('winston');
require('winston-daily-rotate-file');

var loggerOptions = {};

export async function setLoggerOptions(options) {
    loggerOptions = options;
}


export async function getLogger() {
    try {
        loggerOptions["filename"] = 'configuration-%DATE%.log';
        return winston.createLogger({
            transports: [
                new winston.transports.DailyRotateFile(loggerOptions)
            ]
        });
    } catch (error) {
        console.log("error in getLogger() : " + error.message)
    }
}