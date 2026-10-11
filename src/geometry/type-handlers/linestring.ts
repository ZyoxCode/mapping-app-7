
import type { MercatorCoordinates } from "../../core/math/coordinates/coordinate-types";
import { computeCoordsBounds } from "../../core/math/bounds/bounds";
import { setHandler } from "../registry";
import { buildRing, RingSimplifier } from "../simplification";
import { convertRawCoordsToMercator } from "../../core/math/coordinates/coordinate-conversions";
import type { ZoomLevel } from "../../core/zoom-levels";
import type { PreparedGeometryMap, BuiltGeometryMap } from "../geometry-types";

export type PreparedLineString = PreparedGeometryMap["LineString"];
export type BuiltLineString = BuiltGeometryMap["LineString"];


export function prepareLineString(coordinates: MercatorCoordinates[], zoomLevels: ZoomLevel[]): PreparedLineString {

    const bbox = computeCoordsBounds(coordinates);
    const simplifier = new RingSimplifier(buildRing(coordinates, false), false);

    const coordinatesByZoom: MercatorCoordinates[][] = [];

    for (const zoomLevel of zoomLevels) {
        if (zoomLevel.area != 0) simplifier.simplify(zoomLevel.area);
        coordinatesByZoom.push(simplifier.snapshot());
    }

    return { type: "LineString", bbox, coordinatesByZoom };
}

export function buildLineString(prepared: PreparedLineString): BuiltLineString {
    const pathPerZoom: Path2D[] = [];
    prepared.coordinatesByZoom.forEach((pts, _) => {
        const path = new Path2D();
        if (pts.length >= 2) {
            path.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
        }
        pathPerZoom.push(path);
    });
    return { type: "LineString", bbox: prepared.bbox, pathPerZoom };
}

setHandler("LineString", {
    prepare(geometry, zoomLevels) {
        const coordinates: MercatorCoordinates[] = [];
        geometry.coordinates.forEach((coord) => {
            coordinates.push(convertRawCoordsToMercator(coord));
        });
        return prepareLineString(coordinates, zoomLevels)
    },
    build: buildLineString
});