import type { Coordinates, MercatorCoordinates, RawCoordinates } from "./coordinate-types";

export function convertCoordsToMercator(coordinates: Coordinates): MercatorCoordinates {

    const { lon, lat } = coordinates;

    const x = lon * (Math.PI / 180);

    const clampedLat = Math.max(Math.min(lat, 85.05112878), -85.05112878);

    const latRad = clampedLat * (Math.PI / 180);
    const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2));

    return { x, y };
}

export function convertMercatorToCoords(coordinates: MercatorCoordinates): Coordinates {
    const { x, y } = coordinates;

    const lon = x * (180 / Math.PI);

    const latRad = 2 * Math.atan(Math.exp(y)) - (Math.PI / 2);

    const lat = latRad * (180 / Math.PI);

    return { lon, lat };
}

export function convertRawCoordsToCoords(coordinates: RawCoordinates): Coordinates {
    return { lon: coordinates[0], lat: coordinates[1] };
}

export function convertCoordsToRawCoords(coordinates: Coordinates): RawCoordinates {
    return [coordinates.lon, coordinates.lat];
}

export function convertRawCoordsToMercator(coordinates: RawCoordinates): MercatorCoordinates {
    return convertCoordsToMercator(convertRawCoordsToCoords(coordinates));
}

export function convertMercatorToRawCoords(coordinates: MercatorCoordinates): RawCoordinates {
    return convertCoordsToRawCoords(convertMercatorToCoords(coordinates));
}