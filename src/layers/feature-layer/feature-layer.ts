import type { Viewport } from "../../core/viewport";
import type { FeaturePipeline } from "../../data/feature-pipeline";
import type { BuiltFeature } from "../../features/features";
import type { LabelQueueEntry } from "../../labels/labels-types";
import { Layer, type LayerOptions } from "../layer";

export abstract class FeatureLayer extends Layer {
    pipeline: FeaturePipeline;
    features: BuiltFeature[] = [];
    protected bboxes: Float64Array = new Float64Array(0);
    constructor(options: Partial<LayerOptions> & { pipeline: FeaturePipeline }) {
        super(options);
        this.pipeline = options.pipeline;
    }

    abstract render(ctx: CanvasRenderingContext2D, viewport: Viewport, labelQueue: LabelQueueEntry[]): void;

    abstract additionalLoadProcessing(ctx: CanvasRenderingContext2D): void;

    async load(ctx: CanvasRenderingContext2D) {
        const { features, bboxes } = await this.pipeline.run();
        this.features = features;
        this.additionalLoadProcessing(ctx);
        this.bboxes = bboxes;
        this.ready = true;
        // for (const f of this.features) {
        //     if (f.properties.ADM0_LEFT == 'Egypt') {
        //         console.log(f);
        //     }
        // }
        // if (this.debug) console.log(`${this.name}`, this.features);
    }
}