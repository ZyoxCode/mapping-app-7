import type { Viewport } from "../../../core/viewport";
import { zoomLevelIndex } from "../../../core/zoom-levels";
import type { FeaturePipeline } from "../../../data/feature-pipeline";
import { updateDebugSubBox } from "../../../debug/debug-box";
import type { BuiltFeature } from "../../../features/features";
import { appendToPath } from "../../../geometry/utils";
import { type ResolvedStyleOptions, resolveStyle, applyStyle } from "../../../styles/style-rule";
import type { LayerOptions } from "../../layer";
import { FeatureLayer } from "../feature-layer";

function countVisibleAtZoom(f: BuiltFeature[], zoom: number): number {
    let lo = 0, hi = f.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (f[mid].properties.MIN_ZOOM > zoom) hi = mid; else lo = mid + 1;
    }
    return lo;
}

export class GeometryFeatureLayer extends FeatureLayer {
    constructor(options: Partial<LayerOptions> & { pipeline: FeaturePipeline }) {
        super(options);
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
        //console.log(end, this.features.length, this.features.every((f, i, a) => i === 0 || a[i - 1].properties.MIN_ZOOM <= f.properties.MIN_ZOOM));
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
        //if (this.name == 'borders') updateDebugSubBox('counts', `end: ${end}`);
        for (const [style, path] of buckets) {
            applyStyle(ctx, style, viewport.scale);
            if (style.strokeStyle) ctx.stroke(path);
            if (style.fillStyle) ctx.fill(path, 'evenodd');
        }

    }

    additionalLoadProcessing(): BuiltFeature[] {
        return this.features;
    }
}