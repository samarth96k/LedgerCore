import pino from "pino";

const loggerConfig: pino.LoggerOptions = {
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
};

if (process.env.NODE_ENV !== "production") {
    loggerConfig.transport = {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
        },
    };
}

export const logger = pino(loggerConfig);