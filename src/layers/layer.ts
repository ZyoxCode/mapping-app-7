import { doBoundsIntersect } from "../core/math/bounds/bounds";
import type { Viewport } from "../core/viewport";
import { zoomLevelIndex } from "../core/zoom-levels";
import type { FeatureSource } from "../data/sources";
import type { BuiltFeature } from "../features/features";
import { appendToPath } from "../geometry/utils";
import { applyStyle, normalizeStyle, resolveStyle, type DynamicStyleOptions, type ResolvedStyleOptions, type StyleInput } from "../styles/style-rule";
import { mergeWithDefaults } from "../core/utils";
import { updateDebugSubBox } from "../debug/debug-box";
import type { FeaturePipeline } from "../data/feature-pipeline";


function countVisibleAtZoom(f: BuiltFeature[], zoom: number): number {
    let lo = 0, hi = f.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (f[mid].properties.MIN_ZOOM > zoom) hi = mid; else lo = mid + 1;
    }
    return lo;
}

export type LayerOptions = {
    name: string;
    style?: StyleInput | null;
    debug?: boolean;
}

const DEFAULT_LAYER_OPTIONS: Required<LayerOptions> = {
    name: "Untitled Layer",
    style: null,
    debug: false
};

export abstract class Layer {
    name: string;
    debug: boolean;
    ready: boolean = false;
    style: Partial<DynamicStyleOptions> | null;
    constructor(options: Partial<LayerOptions>) {
        const merged = mergeWithDefaults(options, DEFAULT_LAYER_OPTIONS);
        this.name = merged.name;
        this.debug = merged.debug;
        this.style = merged.style ? normalizeStyle(merged.style) : null
    }

    abstract render(ctx: CanvasRenderingContext2D, viewport: Viewport): void;

    abstract load(): Promise<void>;
}

export class FeatureLayer extends Layer {
    private loggedZoom = false;
    pipeline: FeaturePipeline;
    features: BuiltFeature[] = [];
    private bboxes = new Float64Array(0);
    constructor(options: Partial<LayerOptions> & { pipeline: FeaturePipeline }) {
        super(options);
        this.pipeline = options.pipeline;
    }

    render(ctx: CanvasRenderingContext2D, viewport: Viewport) {

        if (!this.ready || !this.style) return;
        const buckets = new Map<ResolvedStyleOptions, Path2D>();
        const zoom = viewport.convertScaleToZoom(viewport.scale);
        const zoomIndex = zoomLevelIndex(zoom, this.pipeline.zoomLevels); // TODO: do something about this stupid zoomIndex thing

        if (this.name == 'land') updateDebugSubBox('zoomIndex', `Zoom Index: ${zoomIndex}`);

        ctx.fillStyle = "red";

        const vb = viewport.visibleBounds;
        const vMinX = vb.minCorner.x, vMinY = vb.minCorner.y;
        const vMaxX = vb.maxCorner.x, vMaxY = vb.maxCorner.y;

        const end = countVisibleAtZoom(this.features, zoom);   // binary search (below)
        const bb = this.bboxes;

        for (let i = 0; i < end; i++) {
            const k = i * 4;
            if (bb[k] > vMaxX || bb[k + 2] < vMinX || bb[k + 1] > vMaxY || bb[k + 3] < vMinY) continue;

            const feature = this.features[i];

            const style = resolveStyle(this.style, zoom, feature.properties);
            let path = buckets.get(style);
            if (!path) {
                path = new Path2D();
                buckets.set(style, path);
            }
            appendToPath(path, feature.geometry, viewport.visibleBounds, zoomIndex);
        }

        for (const [style, path] of buckets) {
            applyStyle(ctx, style, viewport.scale);
            if (style.strokeStyle) ctx.stroke(path);
            if (style.fillStyle) ctx.fill(path, 'evenodd');
        }
    }

    async load() {
        const built = await this.pipeline.pipeline();
        built.sort((a, b) => a.properties.MIN_ZOOM - b.properties.MIN_ZOOM);
        this.features = built;

        const bb = new Float64Array(built.length * 4);
        built.forEach((f, i) => {
            const b = f.geometry.bbox;
            bb[i * 4] = b.minCorner.x;
            bb[i * 4 + 1] = b.minCorner.y;
            bb[i * 4 + 2] = b.maxCorner.x;
            bb[i * 4 + 3] = b.maxCorner.y;
        });
        this.bboxes = bb;
        this.ready = true;
    }
}