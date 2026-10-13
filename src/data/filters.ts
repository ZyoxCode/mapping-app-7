import type { RawFeature } from "../features/features";
import type { RawGeometryType } from "../geometry/geometry-types";

export type FeatureFilter = (feature: RawFeature) => boolean; // true = keep

export const propertyEquals = (key: string, value: unknown): FeatureFilter =>
    f => f.properties[key] === value;

export const propertyIn = (key: string, values: unknown[]): FeatureFilter => {
    const set = new Set(values);
    return f => set.has(f.properties[key]);
};

export const geometryTypeIn = (...types: RawGeometryType["type"][]): FeatureFilter =>
    f => types.includes(f.geometry.type);

export const not = (filter: FeatureFilter): FeatureFilter =>
    f => !filter(f);

export const anyOf = (...filters: FeatureFilter[]): FeatureFilter =>
    f => filters.some(keep => keep(f));