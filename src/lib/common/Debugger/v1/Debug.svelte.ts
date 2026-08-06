import { SvelteSet } from "svelte/reactivity";
import { PUBLIC_ENV } from "$env/static/public";
import debugLib from "debug";

if (PUBLIC_ENV === "dev") {
    debugLib.enable("exp:*");
}
export const registry = new SvelteSet<string>();

export function newDebugger(namespace: string): any {
    const instance = debugLib(namespace);
    return wrap(instance);
}

export function wrap(instance: any): any {
    registry.add(instance.namespace);
    const originalExtend = instance.extend.bind(instance);
    instance.extend = (...args: string[]) => {
        const child = originalExtend(...args);
        return wrap(child);
    };
    return instance;
}

export function setDebugFilters(filters: string[]) {
    if (typeof window !== "undefined") {
        const filter = filters.join(",");
        localStorage.setItem("debug", filter);
        debugLib.enable(filter);
    }
}

export interface DebugNode {
    name: string;
    fullName: string;
    children: Map<string, DebugNode>;
}

const namespaceTree: DebugNode = $derived.by(() => {
    const root: DebugNode = { name: "", fullName: "", children: new Map() };
    for (const ns of registry) {
        const parts = ns.split(":");
        let current = root;
        let path = "";

        for (const part of parts) {
            path = path ? `${path}:${part}` : part;
            if (!current.children.has(part)) {
                current.children.set(part, {
                    name: part,
                    fullName: path,
                    children: new Map(),
                });
            }
            current = current.children.get(part)!;
        }
    }
    return root;
});

export function getNamespaceTree(): DebugNode {
    return namespaceTree;
}
