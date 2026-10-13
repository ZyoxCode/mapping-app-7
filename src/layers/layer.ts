import type { Viewport } from "../core/viewport";
import { zoomLevelIndex } from "../core/zoom-levels";
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
    /** When false, GeoMap skips rendering this layer (it still loads). */
    visible: boolean = true;
    /** Layers that update asynchronously (e.g. tiles arriving) call this to request a redraw. GeoMap sets it. */
    onChange: () => void = () => { };
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
    pipeline: FeaturePipeline;
    features: BuiltFeature[] = [];
    private bboxes: Float64Array = new Float64Array(0);
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

        const vb = viewport.visibleBounds;
        const vMinX = vb.minCorner.x, vMinY = vb.minCorner.y;
        const vMaxX = vb.maxCorner.x, vMaxY = vb.maxCorner.y;

        const end = countVisibleAtZoom(this.features, zoom);   // binary search (above)
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
        const { features, bboxes } = await this.pipeline.run();
        this.features = features;
        this.bboxes = bboxes;
        this.ready = true;
    }
}