import { dev } from "$app/env";
import { getRequestEvent } from "$app/server";

/**
 * Minimal structured logger with a pino-compatible call surface
 * (`log.info(obj, msg)` / `log.info(msg)` / `log.child(bindings)`).
 *
 * Production: one JSON object per line via `console.*`, which Cloudflare Workers Logs
 * indexes field-by-field. Dev: a compact human-readable line.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";
type Bindings = Record<string, unknown>;

interface LogFn {
    (msg: string): void;
    (obj: Bindings, msg?: string): void;
}

export interface Logger {
    level: LogLevel;
    child(bindings: Bindings): Logger;
    debug: LogFn;
    info: LogFn;
    warn: LogFn;
    error: LogFn;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 20, info: 30, warn: 40, error: 50 };

const CONSOLE: Record<LogLevel, (...args: unknown[]) => void> = {
    debug: console.debug,
    info: console.info,
    warn: console.warn,
    error: console.error,
};

/** JSON.stringify drops Error fields (they are non-enumerable); expand them explicitly. */
function replacer(_key: string, value: unknown): unknown {
    if (value instanceof Error) {
        return { ...value, name: value.name, message: value.message, stack: value.stack };
    }
    if (typeof value === "bigint") return value.toString();
    return value;
}

function safeStringify(value: unknown): string {
    try {
        return JSON.stringify(value, replacer);
    } catch {
        return JSON.stringify({ msg: "[unserializable log record]" });
    }
}

function createBaseLogger(level: LogLevel, bindings: Bindings): Logger {
    const emit = (lvl: LogLevel, objOrMsg: Bindings | string, msg?: string) => {
        if (LEVEL_RANK[lvl] < LEVEL_RANK[level]) return;
        const fields = typeof objOrMsg === "string" ? {} : objOrMsg;
        const message = typeof objOrMsg === "string" ? objOrMsg : msg;

        if (dev) {
            const ctx = { ...bindings, ...fields };
            const hasCtx = Object.keys(ctx).length > 0;
            CONSOLE[lvl](
                `[${lvl.toUpperCase()}] ${message ?? ""}`,
                ...(hasCtx ? [ctx] : []),
            );
            return;
        }

        CONSOLE[lvl](
            safeStringify({
                level: lvl,
                time: new Date().toISOString(),
                ...bindings,
                ...fields,
                msg: message,
            }),
        );
    };

    return {
        level,
        child: (childBindings) => createBaseLogger(level, { ...bindings, ...childBindings }),
        debug: (o: Bindings | string, m?: string) => emit("debug", o, m),
        info: (o: Bindings | string, m?: string) => emit("info", o, m),
        warn: (o: Bindings | string, m?: string) => emit("warn", o, m),
        error: (o: Bindings | string, m?: string) => emit("error", o, m),
    };
}

export const logger: Logger = createBaseLogger(dev ? "debug" : "warn", {});

export function createLogger(mod: string): Logger {
    return logger.child({ mod });
}

export function getLogger(bindings?: Record<string, unknown>): Logger {
    const log = getRequestEvent().locals.log;
    return bindings ? log.child(bindings) : log;
}
