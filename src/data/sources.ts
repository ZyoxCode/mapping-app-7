import type { RawFeature } from "../features/features";
import { loadFile } from "../core/utils/file";
import { geoJsonParser, type FeatureParser } from "./parsers";

/** A source fetches data and always yields RawFeature[]. */
export interface FeatureSource {
    load(): Promise<RawFeature[]>;
}

export class FileFeatureSource implements FeatureSource {
    private path: string;
    private parser: FeatureParser;

    constructor(path: string, parser: FeatureParser = geoJsonParser) {
        this.path = path;
        this.parser = parser;
    }

    async load(): Promise<RawFeature[]> {
        return this.parser(await loadFile(this.path));
    }
}

export class RawFeatureSource implements FeatureSource {
    private features: RawFeature[];

    constructor(features: RawFeature[]) {
        this.features = features;
    }

    async load(): Promise<RawFeature[]> {
        return this.features;
    }
}