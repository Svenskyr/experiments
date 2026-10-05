/**
 * Export every CCG permutation as a transparent PNG and a white-background PDF.
 *
 * One-time setup: npx playwright install chromium
 *
 * Then: npm run export:ccg-figures
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { createServer } from "vite";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outRoot = path.join(repoRoot, "export/ccg-figures");
const variants = ["full", "choices"] as const;
const figuresPerVariant = 192;

function assertPngHasAlpha(file: string) {
    const colorType = fs.readFileSync(file)[25];
    if (colorType !== 6) {
        throw new Error(`${file} is not an RGBA PNG (color type ${colorType})`);
    }
}

function targetSelector(variant: (typeof variants)[number]) {
    return variant === "full" ? "form.ccg" : ".ccg-frame";
}

async function openReadyPage(browser: Browser, deviceScaleFactor: number) {
    const context = await browser.newContext({
        deviceScaleFactor,
        viewport: { width: 1400, height: 900 },
        colorScheme: "light",
    });
    const page = await context.newPage();
    await page.goto(localUrl, { waitUntil: "load" });
    await page.waitForFunction(() => {
        const frames = [...document.querySelectorAll(".ccg-frame")];
        const images = [...document.querySelectorAll(".player-avatar")];
        if (frames.length !== 384 || images.length !== 768) return false;
        const framesReady = frames.every((el) => getComputedStyle(el).opacity === "1");
        const imagesReady = images.every((img) => img.complete && img.naturalWidth > 0);
        return framesReady && imagesReady;
    }, { timeout: 60_000 });
    return { context, page };
}

async function eachFigure(
    page: Page,
    onFigure: (
        variant: (typeof variants)[number],
        id: string,
        index: number,
    ) => Promise<void>,
) {
    for (const variant of variants) {
        const figures = page.locator(`[data-variant="${variant}"]`);
        const count = await figures.count();
        if (count !== figuresPerVariant) {
            throw new Error(`expected ${figuresPerVariant} ${variant} figures, found ${count}`);
        }
        for (let i = 0; i < count; i++) {
            const id = await figures.nth(i).getAttribute("data-figure-id");
            if (!id) throw new Error(`missing data-figure-id on ${variant} figure ${i}`);
            await onFigure(variant, id, i);
            if ((i + 1) % 48 === 0) console.log(`${variant}: ${i + 1}/${count}`);
        }
    }
}

const server = await createServer({
    configFile: path.join(repoRoot, "scripts/ccg-figures/vite.config.ts"),
});
await server.listen();
const localUrl = server.resolvedUrls?.local[0];
if (!localUrl) {
    await server.close();
    throw new Error("Vite did not report a local URL");
}

const browser = await chromium.launch();
try {
    const png = await openReadyPage(browser, 2);
    try {
        await eachFigure(png.page, async (variant, id, index) => {
            const dir = path.join(outRoot, variant);
            fs.mkdirSync(dir, { recursive: true });
            const file = path.join(dir, `${id}.png`);
            const figure = png.page.locator(
                `[data-variant="${variant}"][data-figure-id="${id}"]`,
            );
            await figure.locator(targetSelector(variant)).screenshot({
                path: file,
                omitBackground: true,
            });
            if (index === 0) assertPngHasAlpha(file);
        });
    } finally {
        await png.context.close();
    }

    const pdf = await openReadyPage(browser, 1);
    try {
        await pdf.page.emulateMedia({ media: "screen" });
        await pdf.page.addStyleTag({
            content: "html, body, .sheet, .figure { background: white !important; }",
        });
        await eachFigure(pdf.page, async (variant, id) => {
            const dir = path.join(outRoot, "pdf", variant);
            fs.mkdirSync(dir, { recursive: true });
            const size = await pdf.page.evaluate(({ variant, id, selector }) => {
                const root = document.querySelector(
                    `[data-variant="${variant}"][data-figure-id="${id}"]`,
                );
                const target = root?.querySelector(selector);
                if (!(target instanceof HTMLElement)) {
                    throw new Error(`missing ${selector} for ${variant}/${id}`);
                }
                const app = document.getElementById("app");
                if (app) app.style.display = "none";
                const clone = target.cloneNode(true);
                if (!(clone instanceof HTMLElement)) {
                    throw new Error(`could not clone ${selector} for ${variant}/${id}`);
                }
                clone.style.position = "absolute";
                clone.style.top = "0";
                clone.style.left = "0";
                clone.style.breakInside = "avoid";
                let mount = document.getElementById("pdf-mount");
                if (!mount) {
                    mount = document.createElement("div");
                    mount.id = "pdf-mount";
                    document.body.appendChild(mount);
                }
                mount.replaceChildren(clone);
                const width = Math.ceil(clone.scrollWidth);
                const height = Math.ceil(clone.scrollHeight);
                const style = document.getElementById("pdf-page") ?? document.createElement("style");
                style.id = "pdf-page";
                style.textContent = `@page { size: ${width}px ${height}px; margin: 0; }
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; }`;
                document.head.appendChild(style);
                return { width, height };
            }, { variant, id, selector: targetSelector(variant) });

            await pdf.page.pdf({
                path: path.join(dir, `${id}.pdf`),
                printBackground: true,
                preferCSSPageSize: true,
                width: `${size.width}px`,
                height: `${size.height}px`,
                margin: { top: "0", right: "0", bottom: "0", left: "0" },
            });
        });
    } finally {
        await pdf.context.close();
    }
} finally {
    await browser.close();
    await server.close();
}

console.log(
    `wrote ${figuresPerVariant * variants.length} PNGs and the same number of PDFs under ${outRoot}`,
);
