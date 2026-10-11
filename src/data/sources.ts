import type { ZoomLevel } from "../core/zoom-levels";
import type { BuiltFeature, PreparedFeature, RawFeature } from "../features/features";
import { buildGeometry, prepareGeometry } from "../geometry";



const DEFAULT_ZOOM_LEVELS: ZoomLevel[] = [
    { area: 0, zoom: 0 }
]

export abstract class FeatureSource {
    protected rawFeatures: RawFeature[] = [];
    protected preparedFeatures: PreparedFeature[] = [];
    protected builtFeatures: BuiltFeature[] = [];
    protected zoomLevels: ZoomLevel[] = [{ area: 0, zoom: 0 }];

    abstract load(): Promise<void>;
    abstract prepareFeatures(): void;
    abstract buildFeatures(): void;
    abstract getFeatures(): BuiltFeature[];

    constructor(zoomLevels: ZoomLevel[]) {
        this.zoomLevels = zoomLevels;
    }
}

export class DefinedFeatureSource extends FeatureSource {
    constructor(rawFeatures: RawFeature[], zoomLevels: ZoomLevel[] = DEFAULT_ZOOM_LEVELS) {
        super(zoomLevels);
        this.rawFeatures = rawFeatures;
    }

    async load() {
        return Promise.resolve();
    }

    prepareFeatures(): void {
        this.preparedFeatures = this.rawFeatures.flatMap((feature) => {
            if (!feature.geometry) return [];

            const geometry = prepareGeometry(feature.geometry, this.zoomLevels);
            if (!geometry) return [];

            return [{ ...feature, geometry }];

        })
    }

    buildFeatures() {
        if (this.preparedFeatures.length == 0) throw new Error("No prepared features");
        this.builtFeatures = this.preparedFeatures.map((prepared) => {
            return {
                ...prepared,
                geometry: buildGeometry(prepared.geometry)
            }
        });
    }

    getFeatures(): BuiltFeature[] {
        return this.builtFeatures;
    }
}