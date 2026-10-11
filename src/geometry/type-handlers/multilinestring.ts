
import type { MercatorCoordinates } from "../../core/math/coordinates/coordinate-types";
import { computeCoordsBounds, computeUnionOfBounds } from "../../core/math/bounds/bounds";
import { setHandler } from "../registry";
import { convertRawCoordsToMercator } from "../../core/math/coordinates/coordinate-conversions";
import type { ZoomLevel } from "../../core/zoom-levels";
import type { PreparedGeometryMap, BuiltGeometryMap } from "../geometry-types";
import { buildLineString, prepareLineString } from "./linestring";

export type PreparedMultiLineString = PreparedGeometryMap["MultiLineString"];
export type BuiltMultiLineString = BuiltGeometryMap["MultiLineString"];

function coordKey(c: MercatorCoordinates, precision = 7): string {
    return `${c.x.toFixed(precision)},${c.y.toFixed(precision)}`;
}
export function mergeLineStrings(lines: MercatorCoordinates[][]): MercatorCoordinates[][] {
    const endpointMap = new Map<string, { lineIndex: number; end: 'start' | 'end' }[]>();

    lines.forEach((line, i) => {
        if (line.length < 2) return;
        const push = (key: string, entry: { lineIndex: number; end: 'start' | 'end' }) => {
            const list = endpointMap.get(key);
            list ? list.push(entry) : endpointMap.set(key, [entry]);
        };
        push(coordKey(line[0]), { lineIndex: i, end: 'start' });
        push(coordKey(line[line.length - 1]), { lineIndex: i, end: 'end' });
    });

    const used = new Array(lines.length).fill(false);
    const merged: MercatorCoordinates[][] = [];

    function nextAt(key: string, exclude: number) {
        const entries = endpointMap.get(key) ?? [];
        if (entries.length !== 2) return null; // 1 = dead end, 3+ = real junction — stop either way
        const other = entries.find(e => e.lineIndex !== exclude);
        return other && !used[other.lineIndex] ? other : null;
    }

    for (let i = 0; i < lines.length; i++) {
        if (used[i] || lines[i].length < 2) continue;
        used[i] = true;
        let chain = lines[i].slice();
        let tail = i;

        for (let next = nextAt(coordKey(chain[chain.length - 1]), tail); next;) {
            const nextLine = lines[next.lineIndex];
            chain = chain.concat(next.end === 'start' ? nextLine.slice(1) : nextLine.slice(0, -1).reverse());
            used[next.lineIndex] = true;
            tail = next.lineIndex;
            next = nextAt(coordKey(chain[chain.length - 1]), tail);
        }

        let head = i;
        for (let prev = nextAt(coordKey(chain[0]), head); prev;) {
            const prevLine = lines[prev.lineIndex];
            chain = (prev.end === 'end' ? prevLine.slice(0, -1) : prevLine.slice(1).reverse()).concat(chain);
            used[prev.lineIndex] = true;
            head = prev.lineIndex;
            prev = nextAt(coordKey(chain[0]), head);
        }

        merged.push(chain);
    }

    return merged;
}

export function prepareMultiLineString(coordinates: MercatorCoordinates[][], zoomLevels: ZoomLevel[]): PreparedMultiLineString {
    const merged = mergeLineStrings(coordinates);
    return { type: "MultiLineString", bbox: computeUnionOfBounds(merged.map(coord => computeCoordsBounds(coord))), children: merged.map(poly => prepareLineString(poly, zoomLevels)) };
}

export function buildMultiLineString(prepared: PreparedMultiLineString): BuiltMultiLineString {
    return { type: "MultiLineString", bbox: prepared.bbox, children: prepared.children.map(part => buildLineString(part)) };
}

setHandler("MultiLineString", {
    prepare(geometry, zoomLevels) {
        const coordinates: MercatorCoordinates[][] = [];
        geometry.coordinates.forEach((line) => {
            const processedLine: MercatorCoordinates[] = [];
            line.forEach((coord) => {
                processedLine.push(convertRawCoordsToMercator(coord));
            });
            coordinates.push(processedLine);
        });
        return prepareMultiLineString(coordinates, zoomLevels)
    },
    build: buildMultiLineString,
});


