import type { FeatureSource } from "../data/sources";
import type { BuiltFeature } from "../features/features";
import { mergeWithDefaults } from "../utils";


export type LayerOptions = {
    debug?: boolean;
}

const DEFAULT_LAYER_OPTIONS: Required<LayerOptions> = {
    debug: false
};

export abstract class Layer {
    debug: boolean;
    constructor(options: Partial<LayerOptions>) {
        const merged = mergeWithDefaults(options, DEFAULT_LAYER_OPTIONS);
        this.debug = merged.debug;
    }

    abstract render(): void;

    abstract load(): Promise<void>;
}

export class FeatureLayer extends Layer {
    source: FeatureSource;
    features: BuiltFeature[] = [];
    constructor(options: Partial<LayerOptions> & { source: FeatureSource }) {
        super(options);
        this.source = options.source;
    }

    render() {
        console.log("rendering feature layer");
    }

    async load() {
        await this.source.load();
        this.source.prepareFeatures();
        this.source.buildFeatures();

        this.features = this.source.getFeatures();
        console.log("loaded features", this.features);
    }
}