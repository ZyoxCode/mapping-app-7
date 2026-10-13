
import { convertCoordsToMercator } from "../../../core/math/coordinates/coordinate-conversions";
import type { MercatorCoordinates } from "../../../core/math/coordinates/coordinate-types";
import type { Viewport } from "../../../core/viewport";
import type { FeaturePipeline } from "../../../data/feature-pipeline";
import type { LabelQueueEntry } from "../../../labels/labels-types";
import { getFontSize, measureLinesPerPx, scaleLabelBounds, wrapText } from "../../../labels/utils";
import { resolveStyle } from "../../../styles/style-rule";
import type { LayerOptions } from "../../layer";
import { FeatureLayer } from "../feature-layer";

export type TextOption = { MIN_ZOOM: number, lines: string[], widthPerPx: number, heightPerPx: number };
export type MarkerFunction = (props: Record<string, any>) => MarkerConfig;
export type MarkerConfig = {
    radii: number[],
    fillColor: string;
    strokeColor?: string;
    lineWidth?: number;
}

export type CachedLabel = {
    textOptions: TextOption[];
    properties: Record<string, any>;
    coordinates: MercatorCoordinates;
    MIN_ZOOM: number;
    MAX_ZOOM: number;
    layerOffset: number;
    marker?: MarkerConfig;
}

export type TextFn = { MIN_ZOOM: number, fn: (props: Record<string, any>) => string };

function countStartedBy(items: { MIN_ZOOM: number }[], zoom: number): number {
    let lo = 0, hi = items.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (items[mid].MIN_ZOOM > zoom) hi = mid; else lo = mid + 1;
    }
    return lo;
}

export class LabelFeatureLayer extends FeatureLayer {
    cachedLabels: CachedLabel[] = [];
    layerOffset: number;
    textFns: TextFn[];
    maxChars: number;
    markerFunction?: MarkerFunction;
    constructor(options: Partial<LayerOptions> & { pipeline: FeaturePipeline } & { textFns: TextFn[], layerOffset?: number, maxChars?: number, markerFunction?: MarkerFunction }) {
        super(options);
        this.textFns = options.textFns.sort((a, b) => b.MIN_ZOOM - a.MIN_ZOOM);
        this.layerOffset = options.layerOffset ?? 0;
        this.maxChars = options.maxChars ?? 15;
        this.markerFunction = options.markerFunction;
    }

    additionalLoadProcessing(ctx: CanvasRenderingContext2D): void { // Where the caching happens
        for (const feature of this.features) {
            const textOptions: TextOption[] = this.textFns.flatMap(({ MIN_ZOOM, fn }) => {                  // this option doesn't apply to this feature)
                const style = resolveStyle(this.style, feature.properties.MIN_ZOOM, feature.properties);
                const font = style.font;
                const text = fn(feature.properties);
                if (!text) return [];                    // this option doesn't apply to this feature
                const lines = wrapText(text, this.maxChars);
                return [{ MIN_ZOOM, lines, ...measureLinesPerPx(lines, font, ctx) }];
            });

            this.cachedLabels.push({
                textOptions,
                properties: feature.properties,
                coordinates: convertCoordsToMercator({ lon: feature.properties.LABEL_X, lat: feature.properties.LABEL_Y }),
                MIN_ZOOM: feature.properties.MIN_ZOOM,
                MAX_ZOOM: feature.properties.MAX_ZOOM,
                layerOffset: this.layerOffset,
                marker: this.markerFunction ? this.markerFunction(feature.properties) : undefined,
            })
        }
        this.cachedLabels = this.cachedLabels.sort((a, b) => a.MIN_ZOOM - b.MIN_ZOOM);
    }



    render(_ctx: CanvasRenderingContext2D, viewport: Viewport, labelQueue: LabelQueueEntry[]) {
        if (!this.ready || !this.style) return;

        const zoom = viewport.convertScaleToZoom(viewport.scale);
        const end = countStartedBy(this.cachedLabels, zoom);
        const vb = viewport.visibleBounds;

        for (let i = 0; i < end; i++) {
            const label = this.cachedLabels[i];
            if (label.MAX_ZOOM <= zoom) continue;

            const { x, y } = label.coordinates;
            if (x < vb.minCorner.x || x > vb.maxCorner.x || y < vb.minCorner.y || y > vb.maxCorner.y) continue;

            // textOptions is sorted highest MIN_ZOOM first, so the first match is the most detailed allowed
            const option = label.textOptions.find(o => o.MIN_ZOOM <= zoom);
            if (!option) continue;

            const style = resolveStyle(this.style, zoom, label.properties);
            const { lineHeight, bounds } = scaleLabelBounds(option, getFontSize(style.font));

            labelQueue.push({
                lines: option.lines,
                style,
                coordinates: label.coordinates,
                MIN_ZOOM: label.MIN_ZOOM,
                bbox: bounds,
                lineHeight,
                layerOffset: this.layerOffset,
                marker: label.marker ?? undefined,
            });
        }
    }
}