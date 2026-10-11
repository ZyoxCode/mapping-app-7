import type { BuiltGeometry, PreparedGeometry, RawGeometryType } from "../geometry/geometry-types";

export interface RawFeature {
    geometry: RawGeometryType;
    properties: { [key: string]: any };
}

export interface PreparedFeature {
    geometry: PreparedGeometry;
    properties: { [key: string]: any };
}

export interface BuiltFeature {
    geometry: BuiltGeometry;
    properties: { [key: string]: any };
}