import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type ChevronExportSpec, chevronsToSvg } from "./chevrons.ts";

function isMainModule(moduleUrl: string): boolean {
    const entry = process.argv[1];
    return entry !== undefined && fileURLToPath(moduleUrl) === resolve(entry);
}

export async function exportChevronSpec(
    spec: ChevronExportSpec,
    outputDir: string,
): Promise<void> {
    const entries = Object.entries(spec);
    if (entries.length === 0) {
        console.warn(`No chevrons to export (empty spec) -> ${outputDir}`);
        return;
    }

    try {
        await mkdir(outputDir, { recursive: true });
    } catch (err) {
        console.error(`Failed to create output directory ${outputDir}:`, err);
        throw err;
    }

    let wrote = 0;
    let unchanged = 0;

    for (const [name, options] of entries) {
        const filePath = join(outputDir, `${name}.svg`);

        let svg: string;
        try {
            svg = chevronsToSvg(options);
        } catch (err) {
            console.error(`Failed to generate SVG for "${name}":`, err);
            throw err;
        }

        let existing: string | null = null;
        try {
            existing = await readFile(filePath, "utf8");
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
                console.error(`Failed to read existing file ${filePath}:`, err);
                throw err;
            }
        }

        if (existing === svg) {
            console.log(`unchanged: ${filePath}`);
            unchanged++;
            continue;
        }

        try {
            await writeFile(filePath, svg, "utf8");
        } catch (err) {
            console.error(`Failed to write ${filePath}:`, err);
            throw err;
        }
        console.log(`wrote: ${filePath}`);
        wrote++;
    }

    console.log(
        `Export complete: ${wrote} wrote, ${unchanged} unchanged -> ${outputDir}`,
    );
}

export async function exportIfMain(
    moduleUrl: string,
    spec: ChevronExportSpec,
    outputDir?: string,
): Promise<void> {
    if (!isMainModule(moduleUrl)) return;

    const modulePath = fileURLToPath(moduleUrl);
    const stem = basename(modulePath, ".ts");
    const defaultOutputDir = join(dirname(modulePath), stem);
    const resolvedOutputDir = outputDir ?? defaultOutputDir;

    console.log(`Exporting chevrons from ${modulePath} -> ${resolvedOutputDir}`);
    await exportChevronSpec(spec, resolvedOutputDir);
}
