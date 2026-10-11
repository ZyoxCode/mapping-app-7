import type { Bounds } from "../core/math/bounds/bounds";
import type { Coordinates, MercatorCoordinates, RawCoordinates, ScreenCoordinates } from "../core/math/coordinates/coordinate-types";

export interface GeometryTypeCoordinateFormats<CoordinateFormat = RawCoordinates | ScreenCoordinates | MercatorCoordinates | Coordinates> {
    Point: CoordinateFormat;
    LineString: CoordinateFormat[];
    MultiLineString: CoordinateFormat[][];
    Polygon: CoordinateFormat[][];
    MultiPolygon: CoordinateFormat[][][];
};

export type SingleType = "Polygon" | "LineString" | "Point";
export type MultiType = "MultiPolygon" | "MultiLineString";

export type RawGeometryType = {
    [K in keyof GeometryTypeCoordinateFormats]: {
        type: K;
        coordinates: GeometryTypeCoordinateFormats<RawCoordinates>[K];
    }
}[keyof GeometryTypeCoordinateFormats];

export interface ParentToChildType {
    MultiLineString: "LineString";
    MultiPolygon: "Polygon";
};

export type PreparedSingle = { // prepared goes to mercator
    [K in SingleType]: {
        type: K;
        bbox: Bounds;
        coordinatesByZoom: GeometryTypeCoordinateFormats<MercatorCoordinates>[K][];
    }
};

export type PreparedMulti = { // prepared goes to mercator
    [K in MultiType]: {
        type: K;
        bbox: Bounds;
        children: PreparedSingle[ParentToChildType[K]][];
    }
};

export type BuiltSingle = {
    [K in SingleType]: {
        type: K;
        bbox: Bounds;
        pathPerZoom: Path2D[];
    }
}

export type BuiltMulti = {
    [K in MultiType]: {
        type: K;
        bbox: Bounds;
        children: BuiltSingle[ParentToChildType[K]][];
    }
};

export type PreparedGeometryMap = PreparedSingle & PreparedMulti;
export type PreparedGeometry = PreparedGeometryMap[keyof PreparedGeometryMap];

export type BuiltGeometryMap = BuiltSingle & BuiltMulti;
export type BuiltGeometry = BuiltGeometryMap[keyof BuiltGeometryMap];