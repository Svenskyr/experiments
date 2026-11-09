/**
 * Shared logic for `scripts/versions.ts`: import closures, module versions, changelogs, packages.
 *
 * Definitions (see docs/style-guide/04-versioning.md):
 *   - Module folder: a directory under src/lib/common/ or src/lib/exp/ named `v<MAJOR>`.
 *   - Module version: the newest `## X.Y.Z[-dev]` heading in the folder's CHANGELOG.md.
 *   - Closure: every file reachable by imports from a set of entry files.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = join(REPO_ROOT, "src");
const EXP_ROOT = join(SRC, "routes", "exp");

/** Files that wrap every experiment. A change to any of them is a global change. */
export const SHELL_FILES = [
    "src/routes/+layout.svelte",
    "src/routes/+layout.ts",
    "src/routes/+layout.server.ts",
    "src/hooks.server.ts",
    "src/app.html",
    "src/env.ts",
    "vite.config.ts",
    "wrangler.jsonc",
];

/** Packages that compile or host every experiment, recorded even if not imported directly. */
const TOOLCHAIN_PACKAGES = [
    "svelte",
    "@sveltejs/kit",
    "@sveltejs/vite-plugin-svelte",
    "@sveltejs/adapter-cloudflare",
    "vite",
];

const VERSIONED_ROOTS = ["src/lib/common/", "src/lib/exp/"];
const PARSED_EXTENSIONS = /\.(ts|js|svelte)$/;
const CHANGELOG = "CHANGELOG.md";

// ---------------------------------------------------------------------------------------------
// Paths

/** Repo-relative POSIX path. */
export function rel(absolutePath: string): string {
    return relative(REPO_ROOT, absolutePath).split(sep).join("/");
}

export function abs(repoRelativePath: string): string {
    return join(REPO_ROOT, repoRelativePath);
}

function walkFiles(dir: string, keep: (path: string) => boolean = () => true): string[] {
    if (!existsSync(dir)) return [];
    const found: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) found.push(...walkFiles(path, keep));
        else if (entry.isFile() && keep(path)) found.push(path);
    }
    return found;
}

export function studyIds(): string[] {
    return readdirSync(EXP_ROOT, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

export function studyDir(studyId: string): string {
    return join(EXP_ROOT, studyId);
}

// ---------------------------------------------------------------------------------------------
// Entry points

export function studyEntries(studyId: string): string[] {
    const routeFiles = walkFiles(studyDir(studyId), (path) => {
        const name = path.split(sep).pop()!;
        return name.startsWith("+");
    });
    return [...routeFiles, ...SHELL_FILES.map(abs).filter(existsSync)];
}

export function siteEntries(): string[] {
    const siteRoutes = walkFiles(join(SRC, "routes"), (path) => {
        const name = path.split(sep).pop()!;
        return name.startsWith("+") && !path.startsWith(EXP_ROOT + sep);
    });
    return [...siteRoutes, ...SHELL_FILES.map(abs).filter(existsSync)];
}

export function scriptEntries(): string[] {
    return walkFiles(join(REPO_ROOT, "scripts"), (path) => PARSED_EXTENSIONS.test(path));
}

/** Files that package.json scripts run directly (e.g. asset generators). */
export function packageScriptEntries(): string[] {
    const pkg = JSON.parse(readFileSync(abs("package.json"), "utf8")) as {
        scripts: Record<string, string>;
    };
    const found = new Set<string>();
    for (const command of Object.values(pkg.scripts)) {
        for (const match of command.matchAll(/(?:^|\s)((?:src|scripts)\/\S+\.ts)/g)) {
            if (existsSync(abs(match[1]))) found.add(abs(match[1]));
        }
    }
    return [...found];
}

// ---------------------------------------------------------------------------------------------
// Closure

export interface Closure {
    /** Absolute paths of every reachable file, entries included. */
    files: Set<string>;
    /** Bare package names imported anywhere in the closure. */
    packages: Set<string>;
    /** Imports that point to a file that does not exist. */
    missing: { from: string; specifier: string }[];
}

const IMPORT_PATTERN =
    /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

/** Remove commented-out code so it does not count as an import. */
function stripComments(text: string): string {
    return text
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/^\s*\/\/.*$/gm, "")
        .replace(/^\s*\/\*[\s\S]*?\*\//gm, "");
}

function packageName(specifier: string): string | null {
    if (specifier.startsWith("node:") || specifier === "bun") return null;
    if (specifier.startsWith("$app/") || specifier === "$app") return "@sveltejs/kit";
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function resolveImport(specifier: string, fromFile: string): string | "external" | null {
    const bare = specifier.split("?")[0];
    let base: string;
    if (bare === "#lib") base = join(SRC, "lib", "index.ts");
    else if (bare.startsWith("#lib/")) base = join(SRC, "lib", bare.slice("#lib/".length));
    else if (bare.startsWith("#exp/")) base = join(EXP_ROOT, bare.slice("#exp/".length));
    else if (bare.startsWith(".")) {
        if (bare.endsWith("/$types") || bare === "./$types") return "external";
        base = resolve(dirname(fromFile), bare);
    } else return "external";

    const candidates = [base, base.replace(/\.js$/, ".ts"), `${base}.ts`, join(base, "index.ts")];
    for (const candidate of candidates) {
        if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
}

export function computeClosure(entries: string[]): Closure {
    const closure: Closure = { files: new Set(), packages: new Set(), missing: [] };
    const queue = [...entries];
    while (queue.length > 0) {
        const file = queue.pop()!;
        if (closure.files.has(file)) continue;
        closure.files.add(file);
        if (!PARSED_EXTENSIONS.test(file)) continue;

        const text = stripComments(readFileSync(file, "utf8"));
        for (const match of text.matchAll(IMPORT_PATTERN)) {
            const specifier = match[1] ?? match[2] ?? match[3];
            const resolved = resolveImport(specifier, file);
            if (resolved === "external") {
                const name = packageName(specifier);
                if (name && !specifier.startsWith(".")) closure.packages.add(name);
            } else if (resolved === null) {
                closure.missing.push({ from: rel(file), specifier });
            } else {
                queue.push(resolved);
            }
        }
    }
    return closure;
}

// ---------------------------------------------------------------------------------------------
// Modules

/** Repo-relative module folder (`src/lib/.../v4`) that owns a file, or null. */
export function moduleOf(repoRelativePath: string): string | null {
    if (!VERSIONED_ROOTS.some((root) => repoRelativePath.startsWith(root))) return null;
    const parts = repoRelativePath.split("/");
    for (let i = parts.length - 2; i >= 0; i--) {
        if (/^v\d+$/.test(parts[i])) return parts.slice(0, i + 1).join("/");
    }
    return null;
}

/** Repo-relative module folders under the versioned roots. */
export function allModules(): string[] {
    const modules = new Set<string>();
    for (const root of VERSIONED_ROOTS) {
        for (const file of walkFiles(abs(root))) {
            const module = moduleOf(rel(file));
            if (module) modules.add(module);
        }
    }
    return [...modules].sort();
}

/** Files under the versioned roots that are not inside a module folder (Markdown excepted). */
export function unversionedLibFiles(): string[] {
    return VERSIONED_ROOTS.flatMap((root) => walkFiles(abs(root)))
        .map(rel)
        .filter((path) => !moduleOf(path) && !path.endsWith(".md"))
        .sort();
}

// ---------------------------------------------------------------------------------------------
// Versions and changelogs

export interface Version {
    major: number;
    minor: number;
    patch: number;
    dev: boolean;
}

export interface ChangelogEntry {
    version: Version;
    heading: string;
    body: string;
}

const HEADING_PATTERN =
    /^## (\d+)\.(\d+)\.(\d+)(-dev)?(?:\s+[—-]\s+(\d{4}-\d{2}-\d{2}))?(?:\s+[—-]\s+(major|minor|patch))?\s*$/;

export function formatVersion(version: Version): string {
    return `${version.major}.${version.minor}.${version.patch}${version.dev ? "-dev" : ""}`;
}

export function parseVersion(text: string): Version | null {
    const match = /^(\d+)\.(\d+)\.(\d+)(-dev)?$/.exec(text.trim());
    if (!match) return null;
    return { major: +match[1], minor: +match[2], patch: +match[3], dev: Boolean(match[4]) };
}

/** Negative if a < b, 0 if equal, positive if a > b. A `-dev` version precedes its release. */
export function compareVersions(a: Version, b: Version): number {
    return a.major - b.major || a.minor - b.minor || a.patch - b.patch
        || (a.dev === b.dev ? 0 : a.dev ? -1 : 1);
}

export function changelogPath(module: string): string {
    return abs(`${module}/${CHANGELOG}`);
}

export function readChangelog(module: string): ChangelogEntry[] | { error: string } {
    const path = changelogPath(module);
    if (!existsSync(path)) return { error: `${module}: missing ${CHANGELOG}` };

    const entries: ChangelogEntry[] = [];
    let current: ChangelogEntry | null = null;
    for (const line of readFileSync(path, "utf8").split("\n")) {
        if (line.startsWith("## ")) {
            const match = HEADING_PATTERN.exec(line);
            if (!match) return { error: `${module}/${CHANGELOG}: malformed heading "${line}"` };
            current = {
                version: { major: +match[1], minor: +match[2], patch: +match[3], dev: !!match[4] },
                heading: line.slice(3).trim(),
                body: "",
            };
            entries.push(current);
        } else if (current) {
            current.body += `${line}\n`;
        }
    }
    for (const entry of entries) entry.body = entry.body.trim();

    if (entries.length === 0) return { error: `${module}/${CHANGELOG}: no version headings` };
    for (let i = 1; i < entries.length; i++) {
        if (compareVersions(entries[i - 1].version, entries[i].version) <= 0) {
            return { error: `${module}/${CHANGELOG}: versions must be listed newest first` };
        }
    }
    const folderMajor = Number(module.split("/").pop()!.slice(1));
    if (entries[0].version.major !== folderMajor) {
        return {
            error: `${module}: CHANGELOG version ${formatVersion(entries[0].version)} `
                + `does not match folder major v${folderMajor}`,
        };
    }
    return entries;
}

export function moduleVersion(module: string): Version | { error: string } {
    const entries = readChangelog(module);
    return "error" in entries ? entries : entries[0].version;
}

/** Changelog entries newer than `from`, up to and including `to`. */
export function entriesBetween(module: string, from: Version, to: Version): ChangelogEntry[] {
    const entries = readChangelog(module);
    if ("error" in entries) return [];
    return entries.filter((entry) =>
        compareVersions(entry.version, from) > 0 && compareVersions(entry.version, to) <= 0
    );
}

// ---------------------------------------------------------------------------------------------
// Packages and files

/** Resolved versions from bun.lock for the given package names. */
export function lockedVersions(names: Iterable<string>): Record<string, string> {
    const lock = readFileSync(abs("bun.lock"), "utf8");
    const versions: Record<string, string> = {};
    for (const name of [...new Set([...names, ...TOOLCHAIN_PACKAGES])].sort()) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
        const match = new RegExp(`^\\s*"${escaped}": \\["${escaped}@([^"]+)"`, "m").exec(lock);
        if (match) versions[name] = match[1];
    }
    return versions;
}

/** True if upgrading `from` → `to` stays within one semver major (minor for 0.x). */
export function sameSemverMajor(from: string, to: string): boolean {
    const [fromMajor, fromMinor] = from.split(".").map(Number);
    const [toMajor, toMinor] = to.split(".").map(Number);
    if (fromMajor !== toMajor) return false;
    return fromMajor !== 0 || fromMinor === toMinor;
}

export function hashFile(path: string): string {
    return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}
