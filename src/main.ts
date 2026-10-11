import { DefinedFeatureSource } from "./data/sources";
import { GeoMap } from "./geo-map/geo-map";
import { FeatureLayer, type Layer } from "./layers/layer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const LAYERS: Layer[] = [
    new FeatureLayer(
        {
            source: new DefinedFeatureSource(
                [
                    {
                        properties: {},
                        geometry: {
                            type: "Polygon",
                            coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90]]]
                        }
                    }
                ]
            )
        }
    )
];

const geoMap = new GeoMap(canvas, LAYERS);

geoMap.load().then(() => {
    console.log("loaded");
});