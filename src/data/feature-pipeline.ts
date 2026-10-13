import { makeZoomLevels, type ZoomLevel } from "../core/zoom-levels";
import type { BuiltFeature, PreparedFeature, RawFeature } from "../features/features";
import { buildGeometry, prepareGeometry } from "../geometry";
import type { FeatureFilter } from "./filters";
import type { FeatureSource } from "./sources";
import { normalizeZoom, type FeatureTransform } from "./transforms"

const DEFAULT_ZOOM_LEVELS = makeZoomLevels([15, 13, 11, 9, 7, 5, 3, 0], 20);

export type FeaturePipelineOptions = {
    source: FeatureSource;
    filters?: FeatureFilter[];
    transforms?: FeatureTransform[];
    zoomLevels?: ZoomLevel[];
};

export type PipelineResult = {
    /** Sorted ascending by MIN_ZOOM. */
    features: BuiltFeature[];
    /** Flat [minX, minY, maxX, maxY] per feature, same order as `features`. */
    bboxes: Float64Array;
};

export class FeaturePipeline {
    readonly source: FeatureSource;
    readonly transforms: FeatureTransform[];
    readonly zoomLevels: ZoomLevel[];
    readonly filters: FeatureFilter[];

    constructor(options: FeaturePipelineOptions) {
        this.source = options.source;
        this.transforms = options.transforms ?? [normalizeZoom];
        this.zoomLevels = options.zoomLevels ?? DEFAULT_ZOOM_LEVELS;
        this.filters = options.filters ?? [];
    }

    transformFeatures(features: RawFeature[]): RawFeature[] {
        return features
            .filter(f => f.geometry && this.filters.every(keep => keep(f)))
            .map(f => this.transforms.reduce((acc, transform) => transform(acc), f));
    }

    prepareFeatures(features: RawFeature[]): PreparedFeature[] {
        return features.flatMap(feature => {
            const geometry = prepareGeometry(feature.geometry, this.zoomLevels);
            if (!geometry) return [];
            return [{ geometry, properties: feature.properties }];
        });
    }

    buildFeatures(preparedFeatures: PreparedFeature[]): BuiltFeature[] {
        return preparedFeatures.map(feature => ({
            geometry: buildGeometry(feature.geometry),
            properties: feature.properties,
        }));
    }

    async run(): Promise<PipelineResult> {
        const raw = await this.source.load();
        const transformed = this.transformFeatures(raw);
        const prepared = this.prepareFeatures(transformed);
        const features = this.buildFeatures(prepared);

        features.sort((a, b) => a.properties.MIN_ZOOM - b.properties.MIN_ZOOM);

        const bboxes = new Float64Array(features.length * 4);
        features.forEach((f, i) => {
            const b = f.geometry.bbox;
            bboxes[i * 4] = b.minCorner.x;
            bboxes[i * 4 + 1] = b.minCorner.y;
            bboxes[i * 4 + 2] = b.maxCorner.x;
            bboxes[i * 4 + 3] = b.maxCorner.y;
        });

        return { features, bboxes };
    }
}