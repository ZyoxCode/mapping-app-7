import { doBoundsIntersect, type Bounds } from "../core/math/bounds/bounds";
import type { MercatorCoordinates } from "../core/math/coordinates/coordinate-types";
import { vectorLength, vectorSubtract } from "../core/math/vectors/utils";
import type { BuiltGeometry } from "./geometry-types";


export function removeDuplicateEnds(ring: MercatorCoordinates[], epsilon = 1e-5): MercatorCoordinates[] {

    if (vectorLength(vectorSubtract(ring[ring.length - 1], ring[0])) < epsilon) {
        return ring.slice(0, -1);
    }

    return ring;
}

export function ringToPath(ring: MercatorCoordinates[], close = false) {
    const path = new Path2D();
    ring.forEach(({ x, y }, i) => {
        i == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
    });
    if (close) path.closePath();
    return path;
}

export function ringArea(ring: MercatorCoordinates[]): number {
    let area = 0;
    for (let i = 0; i < ring.length; i++) {
        const { x: x0, y: y0 } = ring[i];
        const { x: x1, y: y1 } = ring[(i + 1) % ring.length];
        area += x0 * y1 - x1 * y0;
    }
    return Math.abs(area / 2);
}

export function appendToPath(merged: Path2D, built: BuiltGeometry, visible: Bounds, zoomIndex: number, count?: { count: number | null }): void {
    if (built.type === "MultiPolygon" || built.type === "MultiLineString") {
        for (const part of built.children) {
            appendToPath(merged, part, visible, zoomIndex, count)
        }
        return;
    }
    if (!doBoundsIntersect(built.bbox, visible)) return;
    const path = built.pathPerZoom[zoomIndex];
    if (path) merged.addPath(path);
    if (count && count.count) count.count++;
}