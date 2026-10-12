export type ZoomLevel = {
    area: number;
    zoom: number; // lower bound this time
}

export function zoomLevelIndex(webMercZoom: number, levels: ZoomLevel[]): number {
    const index = levels.findIndex(level => webMercZoom >= level.zoom);
    return index === -1 ? levels.length - 1 : index;
}

import { TILE_SIZE } from "./viewport";

const WORLD_RADIANS = 2 * Math.PI;

/** Triangle area (Mercator rad²) that covers `px` square pixels at `zoom`. */
export function areaForPixels(zoom: number, px: number): number {
    const scale = (TILE_SIZE * 2 ** zoom) / WORLD_RADIANS;
    return px / (scale * scale);
}

/**
 * Builds levels from lower-bound zooms. The finest level is unsimplified (area 0).
 * Each coarser level is simplified to at most `px` square pixels at the top of its
 * zoom range, so detail never exceeds what the screen can show.
 */
export function makeZoomLevels(lowerBounds: number[], px = 1): ZoomLevel[] {
    const zooms = [...lowerBounds].sort((a, b) => b - a); // finest first
    return zooms.map((zoom, i) => ({
        zoom,
        area: i === 0 ? 0 : areaForPixels(zooms[i - 1], px),
    }));
}