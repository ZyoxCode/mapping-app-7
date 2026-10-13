import { convertRawCoordsToMercator } from "../core/math/coordinates/coordinate-conversions";
import type { RawFeature } from "../features/features";
import type { RawGeometryType } from "../geometry/geometry-types";
import { ringArea } from "../geometry/utils";

export type FeatureTransform = (feature: RawFeature) => RawFeature;

const ZOOM_STEP = 0.15;

function roundToNearest(num: number, step: number): number {
    return Math.round(num / step) * step;
}

function areaToMinZoom(area: number, targetPx: number): number {
    if (area <= 0) return 9; // degenerate shapes: size unknown, show late
    return Math.log2((targetPx * 2 * Math.PI) / (256 * Math.sqrt(area)));
}

function largestPolygonArea(geometry: RawGeometryType): number | null {
    let polygons;
    if (geometry.type === "Polygon") polygons = [geometry.coordinates];
    else if (geometry.type === "MultiPolygon") polygons = geometry.coordinates;
    else return null; // not an area geometry

    let max = 0;
    for (const polygon of polygons) {
        const ring = polygon[0].map(coord => convertRawCoordsToMercator(coord));
        max = Math.max(max, ringArea(ring));
    }
    return max;
}

/** Normalises min_zoom/max_zoom casing, applies defaults, snaps MIN_ZOOM to ZOOM_STEP. */
export const normalizeZoom: FeatureTransform = feature => {
    const p = feature.properties;
    p.MIN_ZOOM = roundToNearest(p.MIN_ZOOM ?? p.min_zoom ?? 0, ZOOM_STEP);
    p.MAX_ZOOM = p.MAX_ZOOM ?? p.max_zoom ?? Infinity;
    delete p.min_zoom;
    delete p.max_zoom;
    return feature;
};

/**
 * Derives MIN_ZOOM from a feature's largest polygon so that it appears once it is
 * roughly `targetPx` wide. Non-polygon features are left alone. Run before normalizeZoom.
 */
export const autoMinZoom = (targetPx: number): FeatureTransform => feature => {
    const area = largestPolygonArea(feature.geometry);
    if (area !== null) feature.properties.MIN_ZOOM = areaToMinZoom(area, targetPx);
    return feature;
};