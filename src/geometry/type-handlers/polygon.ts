
import type { MercatorCoordinates } from "../../core/math/coordinates/coordinate-types";
import { computeCoordsBounds } from "../../core/math/bounds/bounds";
import { setHandler } from "../registry";
import { buildRing, RingSimplifier } from "../simplification";
import { convertRawCoordsToMercator } from "../../core/math/coordinates/coordinate-conversions";
import type { ZoomLevel } from "../../core/zoom-levels";
import type { PreparedGeometryMap, BuiltGeometryMap } from "../geometry-types";
import { removeDuplicateEnds, ringArea } from "../utils";


export type PreparedPolygon = PreparedGeometryMap["Polygon"];
export type BuiltPolygon = BuiltGeometryMap["Polygon"];

export function preparePolygon(coordinates: MercatorCoordinates[][], zoomLevels: ZoomLevel[]): PreparedPolygon {

    const bbox = computeCoordsBounds(coordinates[0]);
    let active = coordinates.map(ring =>
        new RingSimplifier(buildRing(removeDuplicateEnds(ring), true), true)
    );

    const coordinatesByZoom: MercatorCoordinates[][][] = [];
    for (const zoomLevel of zoomLevels) {
        const snapshots = active.map(r => {
            if (zoomLevel.area != 0) r.simplify(zoomLevel.area);
            return r.snapshot();
        });

        const keep = snapshots.map(ring =>
            ring.length >= 3 && (ring.length > 3 || ringArea(ring) >= zoomLevel.area)
        );

        if (!keep[0]) {
            active = [];
            coordinatesByZoom.push([]);
            continue;
        }

        coordinatesByZoom.push(
            snapshots
                .filter((_, i) => keep[i])
        );
        active = active.filter((_, i) => keep[i]);
    }

    return { type: "Polygon", bbox, coordinatesByZoom };
}

export function buildPolygon(prepared: PreparedPolygon): BuiltPolygon {
    const pathPerZoom = prepared.coordinatesByZoom.map(rings => {
        const path = new Path2D();
        for (const ring of rings) {
            if (ring.length < 2) continue;
            path.moveTo(ring[0].x, ring[0].y);
            for (let i = 1; i < ring.length; i++) path.lineTo(ring[i].x, ring[i].y);
            path.closePath();
        }
        return path;
    });
    return { type: "Polygon", bbox: prepared.bbox, pathPerZoom };
}


setHandler("Polygon", {
    prepare(geometry, zoomLevels) {
        const coordinates: MercatorCoordinates[][] = [];
        geometry.coordinates.forEach((ring) => {
            const processedRing: MercatorCoordinates[] = [];
            ring.forEach((coord) => {
                processedRing.push(convertRawCoordsToMercator(coord));
            });
            coordinates.push(processedRing);
        });
        return preparePolygon(coordinates, zoomLevels);
    },
    build(preparedGeometry) {
        return buildPolygon(preparedGeometry);
    }
})