
import type { Bounds } from "../core/math/bounds/bounds";
import type { MercatorCoordinates } from "../core/math/coordinates/coordinate-types";
import type { MarkerConfig } from "../layers/feature-layer/label-feature-layer/label-feature-layer";
import type { ResolvedStyleOptions } from "../styles/style-rule"

export type LabelQueueEntry = {
    lines: string[];
    style: ResolvedStyleOptions;
    coordinates: MercatorCoordinates;
    MIN_ZOOM: number;
    bbox: Bounds;
    lineHeight: number;
    layerOffset: number;
    marker?: MarkerConfig;
}