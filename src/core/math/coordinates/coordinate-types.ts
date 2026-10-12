
export type RawCoordinates = [number, number]; // WGS 84
export type Coordinates = { lon: number, lat: number };
export type MercatorCoordinates = { x: number, y: number }; // In radian form & dimensionless (R=1)
export type ScreenCoordinates = { x: number, y: number };