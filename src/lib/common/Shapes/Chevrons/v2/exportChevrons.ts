import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type ChevronExportSpec, chevronsToSvg } from "./chevrons.ts";

function isMainModule(moduleUrl: string): boolean {
    return fileURLToPath(moduleUrl) === fileURLToPath(Deno.mainModule);
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
        await Deno.mkdir(outputDir, { recursive: true });
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
            existing = await Deno.readTextFile(filePath);
        } catch (err) {
            if (!(err instanceof Deno.errors.NotFound)) {
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
            await Deno.writeTextFile(filePath, svg);
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
