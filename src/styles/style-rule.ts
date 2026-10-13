import { mergeWithDefaults } from "../core/utils";

const STROKE_SCALE = 15000;

export type ResolvedStyleOptions = {
    "fillStyle": string | null;
    "strokeStyle": string | null;
    "lineWidth": number;
    "font": string;
    "dashed": [number, number] | [];
    "textAlign": CanvasTextAlign;
    "lineCap": CanvasLineCap;
    "lineJoin": CanvasLineJoin;
    "strokeScales": boolean;
}

const rawDefaults: ResolvedStyleOptions = {
    fillStyle: null,
    strokeStyle: null,
    lineWidth: 1,
    font: "10px sans-serif",
    dashed: [],
    textAlign: "center",
    lineCap: "round",
    lineJoin: "round",
    strokeScales: true,
};

export type Requirements = {
    zoom: boolean,
    props: string[];
}

export abstract class IndividualStyleRule<T> {
    //requires: Requirements = { zoom: false, props: [] };
    constructor() { }

    abstract get(zoom: number, properties: Record<string, any>): T

}

export class ConstantIndividualStyleRule<T> extends IndividualStyleRule<T> {
    value: T;
    constructor(value: T) {
        super();
        this.value = value;

    }

    get(zoom: number, properties: Record<string, any>): T {
        return this.value;
    }
}

export class VariableIndividualStyleRule<T> extends IndividualStyleRule<T> {
    fn: (zoom: number, properties: Record<string, any>) => T;
    constructor(fn: (zoom: number, properties: Record<string, any>) => T) {
        super();
        this.fn = fn;
    }

    get(zoom: number, properties: Record<string, any>): T {
        return this.fn(zoom, properties);
    }
}

export type StyleInput = {
    [K in keyof ResolvedStyleOptions]?:
    | ResolvedStyleOptions[K]
    | IndividualStyleRule<ResolvedStyleOptions[K]>
    | ((zoom: number, properties: Record<string, any>) => ResolvedStyleOptions[K]);
};

export function normalizeStyle(input: StyleInput): Partial<DynamicStyleOptions> {
    const out: Record<string, IndividualStyleRule<any>> = {};
    for (const [key, value] of Object.entries(input)) {
        if (value === undefined) continue;
        if (value instanceof IndividualStyleRule) out[key] = value;
        else if (typeof value === "function") out[key] = new VariableIndividualStyleRule(value as any);
        else out[key] = new ConstantIndividualStyleRule(value);
    }
    return out as Partial<DynamicStyleOptions>;
}

export type DynamicStyleOptions = {
    [K in keyof ResolvedStyleOptions]: IndividualStyleRule<ResolvedStyleOptions[K]>;
};

export const DEFAULT_STYLE_OPTIONS = Object.fromEntries(
    Object.entries(rawDefaults).map(([key, value]) => [
        key,
        new ConstantIndividualStyleRule(value)
    ])
) as unknown as DynamicStyleOptions;

export function resolveStyle(
    styles: Partial<DynamicStyleOptions>,
    zoom: number,
    properties: Record<string, any>
): ResolvedStyleOptions {
    const merged = mergeWithDefaults(styles, DEFAULT_STYLE_OPTIONS);

    const resolved = {} as ResolvedStyleOptions;

    for (const key of Object.keys(merged) as Array<keyof ResolvedStyleOptions>) {
        (resolved as any)[key] = merged[key].get(zoom, properties);
    }

    if (!resolved.strokeScales) {
        resolved.lineWidth = resolved.lineWidth / STROKE_SCALE;
    }

    return resolved;
}

export function applyStyle(ctx: CanvasRenderingContext2D, style: ResolvedStyleOptions, scale: number): void {
    if (style.fillStyle) ctx.fillStyle = style.fillStyle;
    if (style.strokeStyle) ctx.strokeStyle = style.strokeStyle;
    ctx.lineWidth = style.strokeScales ? (style.lineWidth / scale) : style.lineWidth //(style.strokeScales ? scale : 15000);
    ctx.font = style.font;
    ctx.textAlign = style.textAlign;
    ctx.setLineDash(style.strokeScales ? (style.dashed.map(value => value / scale)) : style.dashed);
    ctx.lineCap = style.lineCap;
    ctx.lineJoin = style.lineJoin;
}