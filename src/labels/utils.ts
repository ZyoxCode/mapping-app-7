import type { Bounds } from "../core/math/bounds/bounds";
import { applyStyle, type ResolvedStyleOptions } from "../styles/style-rule";

const PADDING = 4;

export function wrapText(text: string, maxChars: number): string[] {
    if (maxChars <= 0) return [text];

    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const testLine = current ? `${current} ${word}` : word;
        if (testLine.length > maxChars && current) {
            lines.push(current);
            current = word;
        } else {
            current = testLine;
        }
    }
    if (current) lines.push(current);

    return lines;
}


export function buildLabelBounds(text: string, lines: string[], style: ResolvedStyleOptions, ctx: CanvasRenderingContext2D): { lineHeight: number, bounds: Bounds } {
    applyStyle(ctx, style, 1); /* 
    has to set the style before measuring (because of font sizes and stuff)
    1 for scale doesn't matter because it's only used for the adjusted stroke width
    */

    const metrics = ctx.measureText(text);
    const textHeight = (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) || 12;

    const widestLine = Math.max(0, ...lines.map(line => ctx.measureText(line).width));
    const halfWidth = widestLine / 2 + PADDING;
    const halfHeight = (textHeight * Math.max(lines.length, 1)) / 2 + PADDING;

    const lineHeight = textHeight + PADDING * 0.5;

    return {
        lineHeight, bounds: { minCorner: { x: -halfWidth, y: - halfHeight }, maxCorner: { x: halfWidth, y: halfHeight } }
    }
}

const FONT_SIZE = /(\d+(?:\.\d+)?)px/; // the size in a CSS font string, e.g. the 16px in "bold 16px Outfit"
const REFERENCE_SIZE = 100;

/** The font string with its size replaced. */
export function withFontSize(font: string, size: number): string {
    return font.replace(FONT_SIZE, `${size}px`);
}

/** The size, in px, of a CSS font string. */
export function getFontSize(font: string): number {
    const match = FONT_SIZE.exec(font);
    if (!match) throw new Error(`No px font size found in "${font}"`);
    return Number(match[1]);
}

/**
 * Measures lines of text once, at a large reference size, and returns the sizes per pixel of font
 * size. At render time, multiply by the real font size.
 */
export function measureLinesPerPx(lines: string[], font: string, ctx: CanvasRenderingContext2D): { widthPerPx: number; heightPerPx: number } {
    ctx.save();
    ctx.font = withFontSize(font, REFERENCE_SIZE);
    const widest = Math.max(0, ...lines.map(line => ctx.measureText(line).width));
    const reference = ctx.measureText("Hg");
    const height = reference.actualBoundingBoxAscent + reference.actualBoundingBoxDescent;
    ctx.restore();
    return { widthPerPx: widest / REFERENCE_SIZE, heightPerPx: height / REFERENCE_SIZE };
}

export function scaleLabelBounds(
    option: { lines: string[]; widthPerPx: number; heightPerPx: number },
    fontSize: number
): { lineHeight: number; bounds: Bounds } {
    const textHeight = option.heightPerPx * fontSize;
    const halfWidth = (option.widthPerPx * fontSize) / 2 + PADDING;
    const halfHeight = (textHeight * Math.max(option.lines.length, 1)) / 2 + PADDING;
    return {
        lineHeight: textHeight + PADDING * 0.5,
        bounds: {
            minCorner: { x: -halfWidth, y: -halfHeight },
            maxCorner: { x: halfWidth, y: halfHeight },
        },
    };
}