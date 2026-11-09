/**
 * Module versioning and experiment freezing. See docs/style-guide/04-versioning.md.
 *
 *   bun scripts/versions.ts list                       Module versions and who imports them
 *   bun scripts/versions.ts check                      Lint modules; verify frozen experiments
 *   bun scripts/versions.ts freeze <study-id>          Freeze a draft/pilot experiment
 *   bun scripts/versions.ts freeze <study-id> --accept           Accept module/package bumps
 *   bun scripts/versions.ts freeze <study-id> --amend "<reason>" Accept any change, with a reason
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import {
    abs,
    allModules,
    changelogPath,
    compareVersions,
    computeClosure,
    entriesBetween,
    formatVersion,
    hashFile,
    lockedVersions,
    moduleOf,
    moduleVersion,
    packageScriptEntries,
    parseVersion,
    rel,
    sameSemverMajor,
    scriptEntries,
    siteEntries,
    studyDir,
    studyEntries,
    studyIds,
    unversionedLibFiles,
    type Version,
} from "./lib/versioning.ts";

interface LogEntry {
    date: string;
    commit: string;
    type: "accept" | "amend";
    reason?: string;
    files?: string[];
    modules?: Record<string, { from: string; to: string; changes: string[] }>;
    packages?: Record<string, { from: string; to: string }>;
}

interface FreezeManifest {
    status: "live" | "closed";
    frozenAt: string;
    commit: string;
    modules: Record<string, string>;
    files: Record<string, string>;
    packages: Record<string, string>;
    log: LogEntry[];
}

interface Snapshot {
    modules: Record<string, string>;
    files: Record<string, string>;
    packages: Record<string, string>;
    errors: string[];
}

const today = () => new Date().toISOString().slice(0, 10);
const manifestPath = (studyId: string) => `${studyDir(studyId)}/freeze.json`;

function currentCommit(): string {
    try {
        return execSync("git rev-parse --short HEAD", {
            cwd: abs("."),
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
        }).trim();
    } catch {
        return "unknown";
    }
}

function readManifest(studyId: string): FreezeManifest | null {
    const path = manifestPath(studyId);
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) as FreezeManifest : null;
}

function writeManifest(studyId: string, manifest: FreezeManifest): void {
    writeFileSync(manifestPath(studyId), `${JSON.stringify(manifest, null, 4)}\n`);
}

// ---------------------------------------------------------------------------------------------
// Snapshots

/** Current state of a study's closure. CHANGELOG.md files are versioned, not hashed. */
function snapshot(studyId: string): Snapshot {
    const closure = computeClosure(studyEntries(studyId));
    const errors = closure.missing.map(({ from, specifier }) =>
        `${from}: import "${specifier}" does not resolve`
    );
    const files: Record<string, string> = {};
    const modules: Record<string, string> = {};

    for (const file of [...closure.files].sort((a, b) => rel(a).localeCompare(rel(b)))) {
        const path = rel(file);
        files[path] = hashFile(file);
        const module = moduleOf(path);
        if (module && !(module in modules)) {
            const version = moduleVersion(module);
            if ("error" in version) errors.push(version.error);
            else modules[module] = formatVersion(version);
        } else if (!module && /^src\/lib\/(common|exp)\//.test(path)) {
            errors.push(`${path}: unversioned library file (move it into a v<N>/ module folder)`);
        }
    }
    return { modules, files, packages: lockedVersions(closure.packages), errors };
}

/** Release every `-dev` module in the study's closure as `<major>.0.0`. */
function releaseDevModules(studyId: string): string[] {
    const released: string[] = [];
    for (const [module, versionText] of Object.entries(snapshot(studyId).modules)) {
        const version = parseVersion(versionText);
        if (!version?.dev) continue;
        const path = changelogPath(module);
        const text = readFileSync(path, "utf8");
        const heading = `## ${formatVersion(version)}`;
        const releasedVersion = formatVersion({ ...version, dev: false });
        writeFileSync(
            path,
            text.replace(
                new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*$`, "m"),
                `## ${releasedVersion} — ${today()} — major`,
            ),
        );
        released.push(`${module} ${releasedVersion}`);
    }
    return released;
}

// ---------------------------------------------------------------------------------------------
// Comparison

interface Diff {
    /** Module files changed without a version bump, or versions that went backwards. */
    unbumped: string[];
    /** Module version bumps within the pinned major. */
    modules: Record<string, { from: string; to: string }>;
    /** Changed files outside any recorded module: experiment folder, shell, new modules. */
    files: string[];
    /** Package upgrades within one semver major. */
    packagePatches: Record<string, { from: string; to: string }>;
    /** Package major upgrades, additions, or removals. */
    packageMajors: Record<string, { from: string; to: string }>;
    /** Modules in the closure that are still `-dev`. */
    devModules: string[];
}

function compare(manifest: FreezeManifest, current: Snapshot): Diff {
    const diff: Diff = {
        unbumped: [],
        modules: {},
        files: [],
        packagePatches: {},
        packageMajors: {},
        devModules: [],
    };

    for (const [module, version] of Object.entries(current.modules)) {
        if (parseVersion(version)?.dev) diff.devModules.push(`${module} ${version}`);
    }

    const paths = new Set([...Object.keys(manifest.files), ...Object.keys(current.files)]);
    const unbumpedModules = new Set<string>();
    for (const path of [...paths].sort()) {
        if (manifest.files[path] === current.files[path]) continue;
        const module = moduleOf(path);
        const from = module ? parseVersion(manifest.modules[module] ?? "") : null;
        const to = module ? parseVersion(current.modules[module] ?? "") : null;
        if (!module || !from || !to) {
            diff.files.push(path);
            continue;
        }
        const order = compareVersions(to, from);
        if (order > 0) {
            diff.modules[module] = { from: formatVersion(from), to: formatVersion(to) };
        } else if (!unbumpedModules.has(module)) {
            unbumpedModules.add(module);
            diff.unbumped.push(
                order === 0
                    ? `${module} changed but is still ${formatVersion(to)}. `
                        + `Add a patch or minor entry to its CHANGELOG.md, or create v${to.major + 1}.`
                    : `${module} went from ${formatVersion(from)} back to ${formatVersion(to)}.`,
            );
        }
    }

    const names = new Set([...Object.keys(manifest.packages), ...Object.keys(current.packages)]);
    for (const name of [...names].sort()) {
        const from = manifest.packages[name] ?? "(none)";
        const to = current.packages[name] ?? "(none)";
        if (from === to) continue;
        const target = manifest.packages[name] && current.packages[name] && sameSemverMajor(from, to)
            ? diff.packagePatches
            : diff.packageMajors;
        target[name] = { from, to };
    }
    return diff;
}

function isClean(diff: Diff): boolean {
    return diff.unbumped.length === 0 && diff.files.length === 0 && diff.devModules.length === 0
        && Object.keys(diff.modules).length === 0 && Object.keys(diff.packagePatches).length === 0
        && Object.keys(diff.packageMajors).length === 0;
}

function report(studyId: string, diff: Diff): string[] {
    const lines: string[] = [];
    for (const message of diff.unbumped) lines.push(`  ✗ ${message}`);
    for (const module of diff.devModules) {
        lines.push(`  ✗ ${module} is a development version. --accept or --amend releases it.`);
    }
    for (const [module, { from, to }] of Object.entries(diff.modules)) {
        lines.push(`  ✗ receives ${module} ${from} → ${to}. Review, then: bun run freeze ${studyId} --accept`);
    }
    for (const [name, { from, to }] of Object.entries(diff.packagePatches)) {
        lines.push(`  ✗ receives package ${name} ${from} → ${to}. Review, then: bun run freeze ${studyId} --accept`);
    }
    for (const [name, { from, to }] of Object.entries(diff.packageMajors)) {
        lines.push(`  ✗ package ${name} ${from} → ${to} is a global change. Verify, then: bun run freeze ${studyId} --amend "<reason>"`);
    }
    for (const path of diff.files) {
        lines.push(`  ✗ ${path} changed. Revert, or: bun run freeze ${studyId} --amend "<reason>"`);
    }
    return lines;
}

// ---------------------------------------------------------------------------------------------
// Commands

function lintModules(): string[] {
    const errors = unversionedLibFiles().map((path) =>
        `${path}: unversioned library file (move it into a v<N>/ module folder)`
    );
    for (const module of allModules()) {
        const version = moduleVersion(module);
        if ("error" in version) errors.push(version.error);
    }
    return errors;
}

function check(): number {
    let failures = 0;
    const lintErrors = lintModules();
    if (lintErrors.length > 0) {
        console.log("Module versioning:");
        for (const error of lintErrors) console.log(`  ✗ ${error}`);
        failures += lintErrors.length;
    }

    for (const studyId of studyIds()) {
        const manifest = readManifest(studyId);
        if (!manifest) continue;
        const current = snapshot(studyId);
        const lines = [
            ...current.errors.map((error) => `  ✗ ${error}`),
            ...report(studyId, compare(manifest, current)),
        ];
        if (lines.length > 0) {
            console.log(`${studyId} (${manifest.status} since ${manifest.frozenAt}):`);
            for (const line of lines) console.log(line);
            failures += lines.length;
        } else {
            console.log(`✓ ${studyId} matches freeze.json`);
        }
    }

    if (failures === 0) console.log("✓ versioning check passed");
    return failures === 0 ? 0 : 1;
}

function freeze(studyId: string, options: { accept: boolean; amend: string | null }): number {
    if (!studyIds().includes(studyId)) {
        console.error(`Unknown study: ${studyId}`);
        return 1;
    }
    const existing = readManifest(studyId);
    const updating = options.accept || options.amend !== null;

    if (!existing && updating) {
        console.error(`${studyId} is not frozen. Run: bun run freeze ${studyId}`);
        return 1;
    }
    if (existing && !updating) {
        console.error(`${studyId} is already frozen. Use --accept or --amend "<reason>".`);
        return 1;
    }

    // Validate before releasing anything, so a refused command changes no files.
    const before = snapshot(studyId);
    const blocking = before.errors.filter((error) => !error.includes("-dev"));
    if (blocking.length > 0) {
        for (const error of blocking) console.error(`✗ ${error}`);
        return 1;
    }
    if (existing) {
        const diff = compare(existing, before);
        if (diff.unbumped.length > 0) {
            for (const message of diff.unbumped) console.error(`✗ ${message}`);
            return 1;
        }
        const needsAmend = diff.files.length > 0 || Object.keys(diff.packageMajors).length > 0;
        if (options.accept && needsAmend) {
            for (const line of report(studyId, { ...diff, modules: {}, packagePatches: {}, devModules: [] })) {
                console.error(line);
            }
            console.error("These changes need --amend \"<reason>\", not --accept.");
            return 1;
        }
    }

    const released = releaseDevModules(studyId);
    for (const module of released) console.log(`released ${module}`);

    const current = snapshot(studyId);
    const commit = currentCommit();

    if (!existing) {
        writeManifest(studyId, {
            status: "live",
            frozenAt: today(),
            commit,
            modules: current.modules,
            files: current.files,
            packages: current.packages,
            log: [],
        });
        console.log(`✓ froze ${studyId}: ${Object.keys(current.files).length} files, `
            + `${Object.keys(current.modules).length} modules, `
            + `${Object.keys(current.packages).length} packages`);
        console.log(`Commit, then tag: git tag exp/${studyId}/live`);
        return 0;
    }

    const diff = compare(existing, current);
    const entry: LogEntry = { date: today(), commit, type: options.amend !== null ? "amend" : "accept" };
    if (options.amend !== null) entry.reason = options.amend;
    if (diff.files.length > 0) entry.files = diff.files;

    const moduleChanges = Object.entries(diff.modules);
    for (const module of released) {
        const [path, version] = module.split(" ");
        if (!existing.modules[path]) diff.modules[path] = { from: "(none)", to: version };
    }
    if (moduleChanges.length > 0 || released.length > 0) {
        entry.modules = Object.fromEntries(
            Object.entries(diff.modules).map(([module, { from, to }]) => {
                const fromVersion = parseVersion(from) ?? { major: 0, minor: 0, patch: 0, dev: false };
                const changes = entriesBetween(module, fromVersion, parseVersion(to) as Version)
                    .map((change) => `${change.heading}\n${change.body}`.trim());
                return [module, { from, to, changes }];
            }),
        );
    }
    const packages = { ...diff.packagePatches, ...diff.packageMajors };
    if (Object.keys(packages).length > 0) entry.packages = packages;

    if (!entry.files && !entry.modules && !entry.packages) {
        console.log(`✓ ${studyId} already matches freeze.json; nothing to record`);
        return 0;
    }

    writeManifest(studyId, {
        ...existing,
        modules: current.modules,
        files: current.files,
        packages: current.packages,
        log: [...existing.log, entry],
    });
    console.log(`✓ recorded ${entry.type} for ${studyId}`);
    return 0;
}

function list(): number {
    const users = new Map<string, Set<string>>();
    const addUser = (files: Set<string>, user: string) => {
        for (const file of files) {
            const module = moduleOf(rel(file));
            if (!module) continue;
            if (!users.has(module)) users.set(module, new Set());
            users.get(module)!.add(user);
        }
    };
    for (const studyId of studyIds()) {
        const frozen = readManifest(studyId) ? " (frozen)" : "";
        addUser(computeClosure(studyEntries(studyId)).files, `${studyId}${frozen}`);
    }
    addUser(computeClosure(siteEntries()).files, "site");
    addUser(computeClosure([...scriptEntries(), ...packageScriptEntries()]).files, "scripts");

    for (const module of allModules()) {
        const version = moduleVersion(module);
        const versionText = "error" in version ? "(no version)" : formatVersion(version);
        const usedBy = [...(users.get(module) ?? [])].sort().join(", ") || "UNUSED";
        console.log(`${module.padEnd(64)} ${versionText.padEnd(12)} ${usedBy}`);
    }
    const unversioned = unversionedLibFiles();
    if (unversioned.length > 0) {
        console.log("\nUnversioned library files:");
        for (const path of unversioned) console.log(`  ${path}`);
    }
    return 0;
}

// ---------------------------------------------------------------------------------------------

const [command, ...args] = process.argv.slice(2);
let exitCode: number;
switch (command) {
    case "list":
        exitCode = list();
        break;
    case "check":
        exitCode = check();
        break;
    case "freeze": {
        const studyId = args.find((arg) => !arg.startsWith("--"));
        const amendIndex = args.indexOf("--amend");
        const amend = amendIndex >= 0 ? (args[amendIndex + 1] ?? "") : null;
        if (!studyId || amend === "") {
            console.error('Usage: bun run freeze <study-id> [--accept | --amend "<reason>"]');
            exitCode = 1;
            break;
        }
        exitCode = freeze(studyId, { accept: args.includes("--accept"), amend });
        break;
    }
    default:
        console.error("Usage: bun scripts/versions.ts <list | check | freeze <study-id>>");
        exitCode = 1;
}
process.exit(exitCode);
