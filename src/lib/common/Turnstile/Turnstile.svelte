<script lang="ts">
import { onMount } from "svelte";

interface Props {
    siteKey: string;
    onVerified?: (token: string) => void;
    onError?: () => void;
}

let { siteKey, onVerified: onVerified, onError }: Props = $props();

let container = $state<HTMLDivElement | null>(null);
let widgetId = $state<string | null>(null);
let pending: ((token: string) => void) | null = null;
let lastToken = $state<string | null>(null);
let readyResolver: (() => void) | null = null;
let readyPromise = new Promise<void>((resolve) => {
    readyResolver = resolve;
});

onMount(() => {
    let script = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com"]',
    );

    if (!script) {
        script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }

    const init = () => {
        if (window.turnstile && container && !widgetId) {
            widgetId = window.turnstile.render(container, {
                sitekey: siteKey,
                execution: "execute", // options: execute, render
                size: "normal", // options: "normal", "compact", "flexible"
                appearance: "execute", // options: "execute", "interaction-only", "always"
                callback: (token: string) => {
                    lastToken = token;
                    if (pending) {
                        pending(token);
                        pending = null;
                    }
                    onVerified?.(token);
                },
                "error-callback": () => {
                    if (pending) {
                        pending = null;
                    }
                    onError?.();
                    window.turnstile?.reset(widgetId!);
                },
            });

            readyResolver?.();
            readyResolver = null;
        }
    };

    if (window.turnstile) {
        init();
    } else if (script.dataset.loaded !== "true") {
        script.onload = init;
    } else {
        setTimeout(init, 0);
    }

    return () => {
        if (window.turnstile && widgetId) {
            window.turnstile.remove(widgetId);
        }
    };
});

export function ready() {
    if (widgetId) return Promise.resolve();
    return readyPromise;
}

export function getToken(): Promise<string | null> {
    if (!window.turnstile || !widgetId) {
        console.error("Turnstile is not fully loaded yet.");
        return Promise.resolve(null);
    }

    if (pending) {
        return new Promise((resolve) => {
            const prev = pending!;
            pending = (token) => {
                prev(token);
                resolve(token);
            };
        });
    }

    return new Promise((resolve) => {
        pending = resolve;
        window.turnstile!.execute(widgetId!);
    });
}

export function reset() {
    lastToken = null;
    if (window.turnstile && widgetId) {
        window.turnstile.reset(widgetId);
    }
}
</script>

<div bind:this={container} class="turnstile"></div>
