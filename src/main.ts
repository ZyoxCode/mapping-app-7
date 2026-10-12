import type { ZoomLevel } from "./core/zoom-levels";
import { FeaturePipeline } from "./data/feature-pipeline";
import { FileAdapterCreateZooms, RawAdapter } from "./data/file-adapter";
import { FileFeatureSource, RawFeatureSource } from "./data/sources";
import { GeoMap } from "./geo-map/geo-map";
import { FeatureLayer, type Layer } from "./layers/layer";

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
            adapter: new RawAdapter(),
        }),
        style: {
            fillStyle: COLORS.water,
        }

    }),
    new FeatureLayer({
        name: 'land',
        pipeline: new FeaturePipeline({
            source: new FileFeatureSource(
                "ne_10m_land.zip",
            ),
            adapter: new FileAdapterCreateZooms(1)
        }),
        style: {
            fillStyle: COLORS.land,
        }
    }),
    new FeatureLayer({
        name: 'lakes',
        pipeline: new FeaturePipeline({
            source: new FileFeatureSource(
                "water-polygons.geojson",
            ),
            adapter: new FileAdapterCreateZooms(10)
        }),
        style: {
            fillStyle: COLORS.water,
        }
    })
    // new FeatureLayer(
    //     {
    //         source: new DefinedFeatureSource(
    //             [
    //                 {
    //                     properties: {},
    //                     geometry: {
    //                         type: "Polygon",
    //                         coordinates: [[[-180, -90], [180, -90], [180, 90], [-180, 90]]]
    //                     }
    //                 }
    //             ]
    //         ),
    //         style: {
    //             fillStyle: COLORS.water,
    //         }
    //     }
    // ),
    // new FeatureLayer(
    //     {
    //         name: 'land',
    //         source: new FileFeatureSource(
    //             "ne_110m_land.zip",
    //         ),
    //         style: {
    //             fillStyle: COLORS.land,
    //         }
    //     }
    // )
];

const geoMap = new GeoMap(canvas, LAYERS, true);

geoMap.load().then(() => {
    console.log("[Main] All Layers Loaded");
});

geoMap.start();