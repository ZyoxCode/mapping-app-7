import type { RawFeature } from "../features/features";

/** Turns already-decoded data (a JS object or a string) into RawFeature[]. */
export type FeatureParser = (data: unknown) => RawFeature[];

/** Handles FeatureCollection, Feature, GeometryCollection, bare geometry, and RawFeature[]. */
export const geoJsonParser: FeatureParser = (data: any) => {
    if (Array.isArray(data)) {
        // shpjs returns an array of FeatureCollections for multi-layer zips
        if (data.length > 0 && data[0]?.type === "FeatureCollection") {
            return data.flatMap((fc: any) => fc.features);
        }
        return data as RawFeature[];
    }
    switch (data?.type) {
        case "FeatureCollection":
            return data.features;
        case "Feature":
            return [data];
        case "GeometryCollection":
            return data.geometries.map((geometry: any) => ({ geometry, properties: {} }));
        case "Point":
        case "LineString":
        case "Polygon":
        case "MultiLineString":
        case "MultiPolygon":
            return [{ geometry: data, properties: {} }];
        default:
            throw new Error(`Unrecognised GeoJSON structure (type: ${data?.type})`);
    }
};

export const labelPointParser: FeatureParser = (data: any) => {
    console.log(data);
    return data.map((feature: any) => {
        feature.geometry = { 'type': 'Point', coordinates: feature.point }
        delete feature.point;
        return feature;
    })
}

/** CSV/TSV text with lat/lon columns -> Point features. */
export const csvPointParser = (latKey = "lat", lonKey = "lon", delimiter = ","): FeatureParser =>
    (data) => {
        const [header, ...rows] = (data as string).trim().split(/\r?\n/);
        const cols = header.split(delimiter).map(c => c.trim());
        const latI = cols.indexOf(latKey);
        const lonI = cols.indexOf(lonKey);
        if (latI < 0 || lonI < 0) throw new Error(`CSV missing ${latKey}/${lonKey} columns`);

        return rows.map(row => {
            const cells = row.split(delimiter);
            const properties: Record<string, any> = {};
            cols.forEach((c, i) => {
                if (i !== latI && i !== lonI) properties[c] = cells[i];
            });
            return {
                geometry: { type: "Point", coordinates: [Number(cells[lonI]), Number(cells[latI])] },
                properties,
            } as RawFeature;
        });
    };



/** Escape hatch: wrap any one-off conversion. */
export const customParser = (fn: (data: any) => RawFeature[]): FeatureParser => fn;