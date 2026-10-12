import { convertCoordsToMercator, convertRawCoordsToCoords, convertRawCoordsToMercator } from "../core/math/coordinates/coordinate-conversions";
import type { RawFeature } from "../features/features";
import { ringArea } from "../geometry/utils";

function areaToMinZoom(area: number, targetPx: number): number {
    const areaDeg2 = area
    if (areaDeg2 <= 0) return 9; // single points: size unknown, show late
    const minZoom = Math.log2((targetPx * 2 * Math.PI) / (256 * Math.sqrt(areaDeg2)));
    return minZoom;
};

function roundToNearest(num: number, step: number): number {
    return Math.round(num / step) * step;
}

export abstract class Adapter {
    forEachFeature(feature: RawFeature): RawFeature {
        if (feature.properties.min_zoom != null) {
            feature.properties.MIN_ZOOM = feature.properties.min_zoom;
            delete feature.properties.min_zoom;

            if (feature.properties.max_zoom != null) {
                feature.properties.MAX_ZOOM = feature.properties.max_zoom;
                delete feature.properties.max_zoom;
            }
        }

        if (feature.properties.MIN_ZOOM == null) {
            feature.properties.MIN_ZOOM = 0;
            feature.properties.MAX_ZOOM = Infinity;
        }

        feature.properties.MIN_ZOOM = roundToNearest(feature.properties.MIN_ZOOM, 0.15);
        return feature;
    }
    abstract adapt(file: any): RawFeature[];
}
export class FileAdapter extends Adapter {
    adapt(file: any): RawFeature[] {
        const features = (file.features as RawFeature[]).map(feature => {
            return this.forEachFeature(feature);
        });
        return features;
    }
}

export class RawAdapter extends Adapter {
    adapt(file: any): RawFeature[] {
        const features = (file as RawFeature[]).map(feature => {
            return this.forEachFeature(feature);
        });
        return features;
    }
}

export class FileAdapterCreateZooms extends FileAdapter {
    targetPx: number;
    constructor(targetPx: number) {
        super();
        this.targetPx = targetPx;
    }
    forEachFeature(feature: RawFeature): RawFeature {
        if (feature.geometry.type == "Polygon") {
            const area = ringArea(feature.geometry.coordinates[0].map(
                coord => convertRawCoordsToMercator(coord)
            ))
            feature.properties.MIN_ZOOM = roundToNearest(areaToMinZoom(area, this.targetPx), 0.15);
            feature.properties.MAX_ZOOM = Infinity;
        } else if (feature.geometry.type == "MultiPolygon") {
            let maxArea = 0;
            for (const polygon of feature.geometry.coordinates) {
                const area = ringArea(polygon[0].map(
                    coord => convertRawCoordsToMercator(coord)
                ))
                if (area > maxArea) maxArea = area;
            }
            feature.properties.MIN_ZOOM = roundToNearest(areaToMinZoom(maxArea, this.targetPx), 0.15);
            feature.properties.MAX_ZOOM = Infinity;
        }

        if (feature.properties.MIN_ZOOM == null) {
            feature.properties.MIN_ZOOM = 0;
            feature.properties.MAX_ZOOM = Infinity;
        }

        return feature;
    }
}