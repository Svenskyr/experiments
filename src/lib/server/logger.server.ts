import { dev } from "$app/environment";
import pino, { type Logger } from "pino";
import { getRequestEvent } from "$app/server";

export const logger = pino({
    // base: null, // pid
    level: dev ? "debug" : "warn",
    transport: dev
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                colorizeObjects: true,
                // translateTime: "SYS:standard",
            },
        }
        : undefined,
});

export function createLogger(mod: string) {
    return logger.child({ mod });
}

export function getLogger(bindings?: Record<string, unknown>): Logger {
    const log = getRequestEvent().locals.log;
    return bindings ? log.child(bindings) : log;
}
