
import type { MercatorCoordinates } from "../../core/math/coordinates/coordinate-types";
import { computeCoordsBounds } from "../../core/math/bounds/bounds";
import { setHandler } from "../registry";
import { buildRing, RingSimplifier } from "../simplification";
import { convertRawCoordsToMercator } from "../../core/math/coordinates/coordinate-conversions";
import type { ZoomLevel } from "../../core/zoom-levels";
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

        const pathPerZoom: Path2D[] = [];
        const path = new Path2D();
        path.moveTo(prepared.coordinatesByZoom[0].x, prepared.coordinatesByZoom[0].y)
        prepared.coordinatesByZoom.forEach(() => {
            pathPerZoom.push(path);
        });
        return { type: "Point", bbox: prepared.bbox, pathPerZoom };

    }
});