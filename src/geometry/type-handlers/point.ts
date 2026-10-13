import type { MercatorCoordinates } from "../../core/math/coordinates/coordinate-types";
import { computeCoordsBounds } from "../../core/math/bounds/bounds";
import { setHandler } from "../registry";
import { convertRawCoordsToMercator } from "../../core/math/coordinates/coordinate-conversions";
import type { PreparedGeometryMap, BuiltGeometryMap } from "../geometry-types";

export type PreparedPoint = PreparedGeometryMap["Point"];
export type BuiltPoint = BuiltGeometryMap["Point"];


setHandler("Point", {
    prepare(geometry, zoomLevels) {
        const coordinates: MercatorCoordinates = convertRawCoordsToMercator(
            geometry.coordinates
        )
        const coordinatesByZoom: MercatorCoordinates[] = [];
        for (const _ in zoomLevels) {
            coordinatesByZoom.push(coordinates);
        }
        return { type: "Point", bbox: computeCoordsBounds([coordinates]), coordinatesByZoom };
    },
    build(prepared: PreparedPoint): BuiltPoint {
        const { x, y } = prepared.coordinatesByZoom[0];
        const path = new Path2D();
        path.moveTo(x, y);
        path.lineTo(x, y); // zero length line makes the stroke render, without this, it doesn't show anything

        const pathPerZoom: Path2D[] = prepared.coordinatesByZoom.map(() => path);
        return { type: "Point", bbox: prepared.bbox, pathPerZoom };
    }
});