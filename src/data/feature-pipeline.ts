import { makeZoomLevels, type ZoomLevel } from "../core/zoom-levels";
import type { BuiltFeature, PreparedFeature, RawFeature } from "../features/features";
import { buildGeometry, prepareGeometry } from "../geometry";
import { Adapter, FileAdapter } from "./file-adapter";
import { FeatureSource, RawFeatureSource } from "./sources";

const DEFAULT_ZOOM_LEVELS = makeZoomLevels([15, 13, 11, 9, 7, 5, 3, 0], 20);

export type FeaturePipelineOptions = {
    source: FeatureSource;
    adapter?: FileAdapter;
    zoomLevels?: ZoomLevel[];
}

export class FeaturePipeline {
    source: FeatureSource;
    adapter: Adapter;
    zoomLevels: ZoomLevel[] = DEFAULT_ZOOM_LEVELS;

    constructor(options: FeaturePipelineOptions) {
        this.source = options.source;
        this.adapter = options.adapter ? options.adapter : new FileAdapter(); // default to file
        this.zoomLevels = options.zoomLevels ? options.zoomLevels : DEFAULT_ZOOM_LEVELS;
    }

    prepareFeatures(features: RawFeature[]): PreparedFeature[] {
        return features.flatMap(feature => {
            if (!feature.geometry) return [];
            const geometry = prepareGeometry(feature.geometry, this.zoomLevels);
            if (!geometry) return [];
            const preparedFeature = { geometry, properties: feature.properties };
            return [preparedFeature];
        });
    }

    buildFeatures(preparedFeatures: PreparedFeature[]): BuiltFeature[] {
        return preparedFeatures.map(feature => {
            const geometry = buildGeometry(feature.geometry);
            const builtFeature = { geometry, properties: feature.properties };
            return builtFeature;
        });
    }

    async pipeline(): Promise<BuiltFeature[]> {

        const rawFile = await this.source.load();
        const rawFeatures = this.adapter.adapt(rawFile);
        console.log(rawFeatures);
        const preparedFeatures = this.prepareFeatures(rawFeatures);
        const builtFeatures = this.buildFeatures(preparedFeatures);

        return builtFeatures;
    }
}
