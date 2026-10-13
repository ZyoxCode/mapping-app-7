import type { ZoomLevel } from "./core/zoom-levels";
import { FeaturePipeline } from "./data/feature-pipeline";
import { geometryTypeIn, not, propertyEquals } from "./data/filters";
import { labelPointParser } from "./data/parsers";
import { FileFeatureSource, RawFeatureSource } from "./data/sources";
import { addToMaxZoom, autoMinZoom, autoMinZoomFromPreCalculated, normalizeZoom, renameProperty } from "./data/transforms";
import { GeoMap } from "./geo-map/geo-map";
import { GeometryFeatureLayer } from "./layers/feature-layer/geometry-feature-layer/geometry-feature-layer";
import { LabelFeatureLayer } from "./layers/feature-layer/label-feature-layer/label-feature-layer";
import type { Layer } from "./layers/layer";
import { TileLayer } from "./layers/tile-layer/tile-layer";
import { VariableIndividualStyleRule } from "./styles/style-rule";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

const COLORS = {
    "water": "#4987a3",
    "land": "#90be8b",
    'borders': "#222222"
};

const alwaysMaxZoom: ZoomLevel[] = [{ area: 0, zoom: 0 }]

const LAYERS: Layer[] = [
    new GeometryFeatureLayer({
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
    new TileLayer({
        name: 'land',
        path: 'land-2.pmtiles',
        sourceLayer: 'land',
        style: { fillStyle: COLORS.land },
    }),
    new GeometryFeatureLayer({
        name: 'borders',
        pipeline: new FeaturePipeline({
            source: new FileFeatureSource(
                "ne_10m_admin_0_boundary_lines_land.zip",
            ),
            transforms: [normalizeZoom],
            filters: [propertyEquals('MIN_ZOOM', 0)]
        }),
        style: {
            strokeStyle: '#222222',
            lineWidth: 0.7,
            strokeScales: true,
        },
        debug: true,
    }),
    // new GeometryFeatureLayer({
    //     name: 'lakes',
    //     pipeline: new FeaturePipeline({
    //         source: new FileFeatureSource(
    //             "water-polygons.geojson"
    //         ),
    //         transforms: [autoMinZoom(10), normalizeZoom],
    //         filters: [geometryTypeIn('Polygon', 'MultiPolygon')],

    //     }),
    //     style: {
    //         fillStyle: COLORS.water,
    //         strokeStyle: COLORS.water,
    //         lineWidth: 0.5
    //     },
    // }),
    new LabelFeatureLayer({
        name: 'label-test',
        pipeline: new FeaturePipeline({
            source: new FileFeatureSource(
                "country-labels.json",
                labelPointParser,
            ),
            transforms: [
                normalizeZoom,
                addToMaxZoom(3),
            ],
        }),
        style: {
            font: new VariableIndividualStyleRule(
                (zoom, props) => {
                    if (zoom < 3) {
                        return "700 13px Outfit";
                    } else {
                        if (['AUS', 'USA', 'RUS', 'CAN', 'CHN'].includes(props.iso)) {
                            return "700 16px Outfit";
                        } else {
                            return "700 14px Outfit";
                        }
                    }

                }

            ),
            fillStyle: 'black',
            strokeStyle: 'white',
            lineWidth: 1.5,
            strokeScales: true,
        },
        textFns: [
            {
                MIN_ZOOM: 0, fn: (props) => {

                    if (props.name.length < 15) {
                        return props.name;
                    } else if (props.brk_name.length < 15) {
                        return props.brk_name;
                    } else {
                        return props.abbrev;
                    }
                }
            },
            {
                MIN_ZOOM: 5, fn: (props) => {
                    return props.name;
                }
            }
        ]

    }),
    // new LabelFeatureLayer({
    //     name: 'water-labels',
    //     pipeline: new FeaturePipeline({
    //         source: new FileFeatureSource(
    //             "water-polygons.labels.json",
    //             labelPointParser,
    //         ),
    //         transforms: [
    //             autoMinZoomFromPreCalculated(1500)
    //         ],
    //     }),
    //     style: {
    //         font: '500 12px Outfit',
    //         fillStyle: "#224d61",
    //         strokeScales: true,
    //     },
    //     textFns: [
    //         {
    //             MIN_ZOOM: 0, fn: (props) => {

    //                 return props.name;
    //             }
    //         },
    //     ]

    // }),
    new LabelFeatureLayer({
        name: 'Populated Places',
        pipeline: new FeaturePipeline({
            source: new FileFeatureSource(
                "ne_10m_populated_places.zip",
            ),
            transforms: [
                renameProperty('LONGITUDE', 'LABEL_X'),
                renameProperty('LATITUDE', 'LABEL_Y'),
                renameProperty('min_zoom', 'MIN_ZOOM'),
                renameProperty('max_zoom', 'MAX_ZOOM'),
            ]
        }),
        style: {
            font: '600 11px Outfit',
            fillStyle: "#111111",
            strokeStyle: 'white',
            lineWidth: 1,
            strokeScales: true,
        },
        textFns: [
            {
                MIN_ZOOM: 0, fn: (props) => {
                    console.log(props);
                    return props.NAME;
                }
            },
        ],
        layerOffset: 10,
        markerFunction: (props) => {
            if (props.ADM0CAP) {
                return {
                    fillColor: 'black',
                    radii: [1.5, 2.5, 3.5],
                }
            } else {
                if (props.MIN_ZOOM > 5) {
                    return {
                        fillColor: 'black',
                        radii: [2],
                    }
                } else {
                    return {
                        fillColor: 'white',
                        radii: [2.5],
                        strokeColor: 'black',
                        lineWidth: 1,
                    }
                }

            }

        }
    })

];

const geoMap = new GeoMap(canvas, LAYERS, true);

geoMap.load().then(() => {
    console.log("[Main] All Layers Loaded");
});

geoMap.start();