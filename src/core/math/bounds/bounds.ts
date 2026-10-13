import type { MercatorCoordinates } from "../coordinates/coordinate-types";

export type RawBounds = [number, number, number, number]; // south, west, north, east
export type Bounds = { minCorner: MercatorCoordinates, maxCorner: MercatorCoordinates };

export function convertRawBoundsToBounds(bounds: RawBounds): Bounds {
    return { minCorner: { y: bounds[0], x: bounds[1] }, maxCorner: { y: bounds[2], x: bounds[3] } }
}

export function initializeInfiniteBounds(): Bounds {
    return { minCorner: { y: Infinity, x: Infinity }, maxCorner: { y: -Infinity, x: -Infinity } };
}

export function updateBounds(bounds: Bounds, coordinate: MercatorCoordinates) {

    bounds.minCorner.y = Math.min(bounds.minCorner.y, coordinate.y);
    bounds.minCorner.x = Math.min(bounds.minCorner.x, coordinate.x);
    bounds.maxCorner.y = Math.max(bounds.maxCorner.y, coordinate.y);
    bounds.maxCorner.x = Math.max(bounds.maxCorner.x, coordinate.x);

}

export function computeCoordsBounds(coordinates: MercatorCoordinates[]): Bounds {
    const result: Bounds = initializeInfiniteBounds();

    coordinates.forEach((coord) => {
        updateBounds(result, coord);
    });

    return result;
}

export function computeUnionOfBounds(bounds: Bounds[]) {
    const result: Bounds = initializeInfiniteBounds();

    for (const bound of bounds) {
        updateBounds(result, bound.minCorner);
        updateBounds(result, bound.maxCorner);
    }

    return result;
}

export function doBoundsIntersect(bounds1: Bounds, bounds2: Bounds) {
    return bounds1.minCorner.y <= bounds2.maxCorner.y
        && bounds1.maxCorner.y >= bounds2.minCorner.y
        && bounds1.minCorner.x <= bounds2.maxCorner.x
        && bounds1.maxCorner.x >= bounds2.minCorner.x;
}

export function isPointInBounds(bounds: Bounds, point: MercatorCoordinates) {
    return point.y >= bounds.minCorner.y
        && point.y <= bounds.maxCorner.y
        && point.x >= bounds.minCorner.x
        && point.x <= bounds.maxCorner.x;
}

export function offsetBounds(bounds: Bounds, offset: MercatorCoordinates): Bounds {
    return {
        minCorner: { y: bounds.minCorner.y + offset.y, x: bounds.minCorner.x + offset.x },
        maxCorner: { y: bounds.maxCorner.y + offset.y, x: bounds.maxCorner.x + offset.x }
    }
}