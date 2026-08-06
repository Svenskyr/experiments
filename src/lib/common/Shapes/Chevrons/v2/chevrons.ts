export interface Chevron {
    orientation: number; // 0-360 degrees
    innerAngle: number; // 0-180 degrees
    length: number; // length of the arms
    width: number; // stroke width of the arms
    color: string; // color of the arms
}

export type TipStyle = "square" | "sharp" | "flat";

export interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
}

export interface ChevronPath {
    d: string;
    fill: string;
    bbox: BBox;
}

interface Point {
    x: number;
    y: number;
}

function norm(v: Point): Point {
    const len = Math.hypot(v.x, v.y);
    if (len === 0) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
}

function add(a: Point, b: Point): Point {
    return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Point, s: number): Point {
    return { x: v.x * s, y: v.y * s };
}

function lineIntersect(p: Point, d: Point, q: Point, e: Point): Point {
    const cross = d.x * e.y - d.y * e.x;
    if (Math.abs(cross) < 1e-10) {
        throw new Error("parallel lines in chevron geometry");
    }
    const qp = { x: q.x - p.x, y: q.y - p.y };
    const t = (qp.x * e.y - qp.y * e.x) / cross;
    return add(p, scale(d, t));
}

function outwardNormal(from: Point, to: Point, interior: Point): Point {
    const dir = norm({ x: to.x - from.x, y: to.y - from.y });
    let n = { x: -dir.y, y: dir.x };
    const toInterior = { x: interior.x - to.x, y: interior.y - to.y };
    if (n.x * toInterior.x + n.y * toInterior.y > 0) {
        n = scale(n, -1);
    }
    return n;
}

function bboxFromPoints(points: Point[]): BBox {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function backCap(
    end: Point,
    armDir: Point,
    outward: Point,
    half: number,
    forward: Point,
    tipStyle: TipStyle,
): [Point, Point] {
    const inner = scale(outward, -1);
    if (tipStyle === "square") {
        return [add(end, scale(outward, half)), add(end, scale(inner, half))];
    }
    const outerLine = add(end, scale(outward, half));
    const innerLine = add(end, scale(inner, half));
    const cutDir = tipStyle === "sharp" ? forward : { x: -forward.y, y: forward.x };
    return [
        lineIntersect(outerLine, armDir, end, cutDir),
        lineIntersect(innerLine, armDir, end, cutDir),
    ];
}

export function chevronToPath(
    c: Chevron,
    offsetBack = 0,
    tipStyle: TipStyle = "square",
): ChevronPath {
    const halfRad = (c.innerAngle * Math.PI) / 360;
    const orientRad = (c.orientation * Math.PI) / 180;
    const half = c.width / 2;

    const cos = Math.cos(halfRad);
    const sin = Math.sin(halfRad);

    // Local space: tip at origin, arms extend "forward" (+Y in local coords)
    const leftX = -c.length * sin;
    const leftY = c.length * cos;
    const rightX = c.length * sin;
    const rightY = c.length * cos;

    const baseX = 0;
    const baseY = -offsetBack;

    const cosO = Math.cos(orientRad);
    const sinO = Math.sin(orientRad);
    const rotate = (x: number, y: number): Point => ({
        x: x * cosO - y * sinO,
        y: x * sinO + y * cosO,
    });

    const tip = rotate(baseX, baseY);
    const left = rotate(leftX + baseX, leftY + baseY);
    const right = rotate(rightX + baseX, rightY + baseY);
    const forward = rotate(0, -1);

    const armDirRight = norm({ x: right.x - tip.x, y: right.y - tip.y });
    const armDirLeft = norm({ x: left.x - tip.x, y: left.y - tip.y });
    const outRight = outwardNormal(tip, right, left);
    const outLeft = outwardNormal(tip, left, right);

    const tipOuter = lineIntersect(
        add(tip, scale(outRight, half)),
        armDirRight,
        add(tip, scale(outLeft, half)),
        armDirLeft,
    );
    const tipInner = lineIntersect(
        add(tip, scale(outRight, -half)),
        armDirRight,
        add(tip, scale(outLeft, -half)),
        armDirLeft,
    );

    const [rightOuter, rightInner] = backCap(
        right,
        armDirRight,
        outRight,
        half,
        forward,
        tipStyle,
    );
    const [leftOuter, leftInner] = backCap(
        left,
        armDirLeft,
        outLeft,
        half,
        forward,
        tipStyle,
    );

    const polygon = [tipOuter, rightOuter, rightInner, tipInner, leftInner, leftOuter];
    const d = `M ${polygon.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;

    return {
        d,
        fill: c.color,
        bbox: bboxFromPoints(polygon),
    };
}

export function chevronsToPaths(
    chevrons: Chevron[],
    spacing: number,
    tipStyle: TipStyle = "square",
): ChevronPath[] {
    return chevrons.map((c, i) => chevronToPath(c, i * (c.length + spacing + c.width), tipStyle));
}

export function unionBBox(paths: ChevronPath[]): BBox | null {
    if (paths.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of paths) {
        if (p.bbox.minX < minX) minX = p.bbox.minX;
        if (p.bbox.minY < minY) minY = p.bbox.minY;
        if (p.bbox.maxX > maxX) maxX = p.bbox.maxX;
        if (p.bbox.maxY > maxY) maxY = p.bbox.maxY;
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Unit vector in the direction the chevron tip points (matches chevronToPath local −Y rotated). */
export function chevronForward(c: Chevron): Point {
    const orientRad = (c.orientation * Math.PI) / 180;
    const sinO = Math.sin(orientRad);
    const cosO = Math.cos(orientRad);
    return { x: sinO, y: -cosO };
}

export interface ViewBoxPadding {
    tip: number;
    rear: number;
    perp: number;
}

function dot(a: Point, b: Point): number {
    return a.x * b.x + a.y * b.y;
}

function fromForwardPerp(f: number, p: number, forward: Point, perp: Point): Point {
    return {
        x: f * forward.x + p * perp.x,
        y: f * forward.y + p * perp.y,
    };
}

/**
 * Expand a bbox with asymmetric padding along the chevron axis.
 * Extra rear padding shifts the glyph toward the tip when the SVG is centered.
 */
export interface ChevronGroupOptions {
    chevrons: Chevron[];
    spacing?: number;
    paddingTip?: number;
    paddingRear?: number;
    paddingPerp?: number;
    tipStyle?: TipStyle;
}

export type ChevronExportSpec = Record<string, ChevronGroupOptions>;

export function chevronsViewBox(options: ChevronGroupOptions): string | undefined {
    const {
        chevrons,
        spacing = 0,
        paddingTip = 0,
        paddingRear = 0,
        paddingPerp = 0,
        tipStyle = "square",
    } = options;

    const paths = chevronsToPaths(chevrons, spacing, tipStyle);
    const bbox = unionBBox(paths);
    if (!bbox || chevrons.length === 0) return undefined;

    const forward = chevronForward(chevrons[0]);
    const padded = bboxWithAsymmetricPadding(bbox, forward, {
        tip: paddingTip,
        rear: paddingRear,
        perp: paddingPerp,
    });
    return `${padded.minX} ${padded.minY} ${padded.width} ${padded.height}`;
}

export function chevronsToSvg(options: ChevronGroupOptions): string {
    const { chevrons, spacing = 0, tipStyle = "square" } = options;
    const paths = chevronsToPaths(chevrons, spacing, tipStyle);
    const viewBox = chevronsViewBox(options);
    const pathElements = paths
        .map((p) => `<path d="${p.d}" fill="${p.fill}"/>`)
        .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${pathElements}</svg>`;
}

export function bboxWithAsymmetricPadding(
    bbox: BBox,
    forward: Point,
    { tip, rear, perp }: ViewBoxPadding,
): BBox {
    const perpAxis = { x: -forward.y, y: forward.x };
    const corners = [
        { x: bbox.minX, y: bbox.minY },
        { x: bbox.maxX, y: bbox.minY },
        { x: bbox.maxX, y: bbox.maxY },
        { x: bbox.minX, y: bbox.maxY },
    ];

    let minF = Infinity, maxF = -Infinity, minP = Infinity, maxP = -Infinity;
    for (const c of corners) {
        const f = dot(c, forward);
        const p = dot(c, perpAxis);
        if (f < minF) minF = f;
        if (f > maxF) maxF = f;
        if (p < minP) minP = p;
        if (p > maxP) maxP = p;
    }

    minF -= rear;
    maxF += tip;
    minP -= perp;
    maxP += perp;

    const paddedCorners = [
        fromForwardPerp(minF, minP, forward, perpAxis),
        fromForwardPerp(maxF, minP, forward, perpAxis),
        fromForwardPerp(maxF, maxP, forward, perpAxis),
        fromForwardPerp(minF, maxP, forward, perpAxis),
    ];
    return bboxFromPoints(paddedCorners);
}
