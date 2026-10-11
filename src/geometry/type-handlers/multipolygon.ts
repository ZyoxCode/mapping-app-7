import type { BuiltGeometryMap, PreparedGeometryMap } from "../geometry-types"
import { computeCoordsBounds, computeUnionOfBounds } from "../../core/math/bounds/bounds";
import type { MercatorCoordinates } from "../../core/math/coordinates/coordinate-types";
import { setHandler } from "../registry";
import { buildPolygon, preparePolygon } from "./polygon";
import type { ZoomLevel } from "../../core/zoom-levels";
import { convertRawCoordsToMercator } from "../../core/math/coordinates/coordinate-conversions";

export type PreparedMultiPolygon = PreparedGeometryMap["MultiPolygon"];
export type BuiltMultiPolygon = BuiltGeometryMap["MultiPolygon"];

export function prepareMultiPolygon(coordinates: MercatorCoordinates[][][], zoomLevels: ZoomLevel[]): PreparedMultiPolygon {
    return { type: "MultiPolygon", bbox: computeUnionOfBounds(coordinates.map(coord => computeCoordsBounds(coord[0]))), children: coordinates.map(poly => preparePolygon(poly, zoomLevels)) };
}

export function buildMultiPolygon(prepared: PreparedMultiPolygon): BuiltMultiPolygon {
    return { type: "MultiPolygon", bbox: prepared.bbox, children: prepared.children.map(part => buildPolygon(part)) };
}

setHandler("MultiPolygon", {
    prepare(geometry, zoomLevels) {
        const coordinates: MercatorCoordinates[][][] = [];
        geometry.coordinates.forEach((polygon) => {
            const processedPolygon: MercatorCoordinates[][] = []
            polygon.forEach((ring) => {
                const processedRing: MercatorCoordinates[] = [];
                ring.forEach((coord) => {
                    processedRing.push(convertRawCoordsToMercator(coord));
                });
                processedPolygon.push(processedRing);
            });
            coordinates.push(processedPolygon);
        });
        return prepareMultiPolygon(coordinates, zoomLevels)
    },
    build: buildMultiPolygon,
});