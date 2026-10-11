import type { MercatorCoordinates } from "../coordinates/coordinate-types";



export function vectorAdd(p1: MercatorCoordinates, p2: MercatorCoordinates): MercatorCoordinates {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function vectorSubtract(p1: MercatorCoordinates, p2: MercatorCoordinates): MercatorCoordinates {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

export function vectorScale(p: MercatorCoordinates, scalar: number): MercatorCoordinates {
    return { x: p.x * scalar, y: p.y * scalar };
}

export function vectorDot(p1: MercatorCoordinates, p2: MercatorCoordinates): number {
    return p1.x * p2.x + p1.y * p2.y;
}

export function vectorCross(p1: MercatorCoordinates, p2: MercatorCoordinates): number {
    return p1.x * p2.y - p1.y * p2.x;
}

export function vectorLength(p: MercatorCoordinates): number {
    return Math.sqrt(p.x * p.x + p.y * p.y);
}

export function triangleArea(p1: MercatorCoordinates, p2: MercatorCoordinates, p3: MercatorCoordinates): number {
    const v1 = vectorSubtract(p2, p1);
    const v2 = vectorSubtract(p3, p1);
    return Math.abs(vectorCross(v1, v2)) / 2;
} // Shoelace formula
