import type { Viewport } from "../core/viewport";
import { normalizeStyle, type DynamicStyleOptions, type StyleInput } from "../styles/style-rule";
import { mergeWithDefaults } from "../core/utils";
import type { LabelQueueEntry } from "../labels/labels-types";


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
    style: Partial<DynamicStyleOptions>;
    constructor(options: Partial<LayerOptions>) {
        const merged = mergeWithDefaults(options, DEFAULT_LAYER_OPTIONS);
        this.name = merged.name;
        this.debug = merged.debug;
        this.style = normalizeStyle(merged.style ?? {});
    }

    abstract render(ctx: CanvasRenderingContext2D, viewport: Viewport, labelQueue: LabelQueueEntry[]): void;

    abstract load(ctx: CanvasRenderingContext2D): Promise<void>;
}



