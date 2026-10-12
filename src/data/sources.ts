
import type { ZoomLevel } from "../core/zoom-levels";
import type { RawFeature } from "../features/features";
import { loadFile } from "../core/utils/file";






export abstract class FeatureSource {
    abstract load(): Promise<any>;
}

export class FileFeatureSource extends FeatureSource {
    private path: string;
    constructor(path: string) {
        super();
        this.path = path;
    }
    async load(): Promise<any> { //change this later to have extensions for each file type
        return loadFile(this.path)
    }
}

export class RawFeatureSource extends FeatureSource {
    private rawFeatures: RawFeature[];
    constructor(rawFeatures: RawFeature[]) {
        super();
        this.rawFeatures = rawFeatures;
    }

    async load(): Promise<any> {
        return Promise.resolve(this.rawFeatures);
    }
}