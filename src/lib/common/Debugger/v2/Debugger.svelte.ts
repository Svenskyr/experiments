import { dev } from "$app/environment";
import { createContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { browser } from "$app/environment";
import debugLib from "debug";
export const [getDebugger, setDebugger] = createContext<Debugger>();

export class Debugger {
    readonly name: string;
    readonly parent: Debugger | null;
    readonly debug: ReturnType<typeof debugLib> | undefined;
    enabled: boolean = $state(false);
    children: SvelteMap<string, Debugger> = new SvelteMap();

    constructor(name: string, parent?: Debugger) {
        this.name = parent ? `${parent.name}:${name}` : name;
        this.parent = parent ?? null;
        this.debug = parent ? parent.debug.extend(name) : debugLib(name);
        if (dev) {
            this.enable();
        }
    }

    get root(): Debugger {
        let current: Debugger = this;
        while (current.parent) {
            current = current.parent;
        }
        return current;
    }

    enable() {
        this.enableRecursively();
    }

    enableShallow() {
        if (this.enabled) return;
        this.enabled = true;
        this.updateEnabledNamespaces();
    }

    enableRecursively() {
        if (this.enabled) return;
        this.enabled = true;
        for (const child of this.children.values()) {
            child.#enableDeepHelper();
        }
        this.updateEnabledNamespaces();
    }

    #enableDeepHelper() {
        if (this.enabled) return;
        this.enabled = true;
        for (const child of this.children.values()) {
            child.#enableDeepHelper();
        }
    }

    disable() {
        this.disableRecursively();
    }

    disableShallow() {
        if (!this.enabled) return;
        this.enabled = false;
        this.updateEnabledNamespaces();
    }

    disableRecursively() {
        if (!this.enabled) return;
        this.enabled = false;
        for (const child of this.children.values()) {
            child.#disableDeepHelper();
        }
        this.updateEnabledNamespaces();
    }

    #disableDeepHelper() {
        if (!this.enabled) return;
        this.enabled = false;
        for (const child of this.children.values()) {
            child.#disableDeepHelper();
        }
    }

    toggle() {
        this.enabled ? this.disable() : this.enable();
    }

    toggleShallow() {
        this.enabled = !this.enabled;
        this.updateEnabledNamespaces();
    }

    toggleRecursively() {
        if (this.enabled) {
            this.disableRecursively();
        } else {
            this.enableRecursively();
        }
    }

    extend(childName: string): Debugger {
        const child = new Debugger(childName, this);
        this.children.set(child.name, child);
        return child;
    }

    updateEnabledNamespaces(): void {
        // if (!browser) return;
        // const enabledNamespaces = collectEnabledNamespaces(this.root);

        // const storedNamespaces = localStorage.getItem("debug")?.split(",") ?? [];
        // const unregisteredNamespaces = storedNamespaces.filter((namespace) =>
        //     !enabledNamespaces.has(namespace)
        // );

        // const filters = [...enabledNamespaces, ...unregisteredNamespaces].sort().join(",");
        // localStorage.setItem("debug", filters);
        // debugLib.enable(filters);

        if (!browser) return;
        const enabledNamespaces = collectEnabledNamespaces(this.root);
        const filters = [...enabledNamespaces].sort().join(",");
        debugLib.enable(filters);
    }
}

function collectEnabledNamespaces(node: Debugger): Set<string> {
    // The question is whether a child should break through the parent's enabled state.
    // Yes: Default on. The parent does not need to be enabled in order to enable the child. If parent enabled, use wildcard. If parent disabled, walk children.
    // No: Default off. Enabling the child does nothing if the parent is not also enabled. If parent enabled, walk children. If parent disabled, do nothing.

    const enabledNamespaces = new Set<string>();
    const walkTree = (dbg: Debugger): void => {
        if (dbg.enabled) enabledNamespaces.add(`${dbg.name}`);
        for (const child of dbg.children.values()) walkTree(child);
    };
    walkTree(node);
    return enabledNamespaces;
}
