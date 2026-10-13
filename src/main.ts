import type { ZoomLevel } from "./core/zoom-levels";
import { FeaturePipeline } from "./data/feature-pipeline";
import { geometryTypeIn } from "./data/filters";
import { labelPointParser } from "./data/parsers";
import { FileFeatureSource, RawFeatureSource } from "./data/sources";
import { autoMinZoom, normalizeZoom } from "./data/transforms";
import { GeoMap } from "./geo-map/geo-map";
import { FeatureLayer, type Layer } from "./layers/layer";
import { TileLayer } from "./layers/tile-layer";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const COLORS = {
    "water": "#4987a3",
    "land": "#90be8b",
    'borders': "#222222"
};

const alwaysMaxZoom: ZoomLevel[] = [{ area: 0, zoom: 0 }]

const LAYERS: Layer[] = [
    new FeatureLayer({
        name: 'water',
        pipeline: new FeaturePipeline({
            source: new RawFeatureSource([{
                properties: {},
                geometry: {
                    type: "Polygon",
                    coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90]]]
                }
            }]),
        }),
        style: {
            fillStyle: COLORS.water,
        }

    }),
    // new FeatureLayer({
    //     name: 'land',
    //     pipeline: new FeaturePipeline({
    //         source: new FileFeatureSource(
    //             "ne_10m_land.zip",
    //         ),
    //         transforms: [autoMinZoom(1), normalizeZoom],
    //     }),
    //     style: {
    //         fillStyle: COLORS.land,
    //     }
    // }),
    new TileLayer({
        name: 'land',
        path: 'land.pmtiles',
        sourceLayer: 'land',
        style: { fillStyle: COLORS.land },
    }),
    new TileLayer({
        name: 'land-test',
        path: 'land-test.pmtiles',
        sourceLayer: 'land',
        style: { fillStyle: COLORS.land },
    }),
    new FeatureLayer({
        name: 'point-test',
        pipeline: new FeaturePipeline({
            source: new FileFeatureSource(
                "country-labels.json",
                labelPointParser,
            ),
            transforms: [normalizeZoom],
        }),
        style: {
            strokeStyle: 'black',
            lineWidth: 2,
            strokeScales: true,
        }
    }),

];

const geoMap = new GeoMap(canvas, LAYERS, true);

geoMap.load().then(() => {
    console.log("[Main] All Layers Loaded");
});

geoMap.start();