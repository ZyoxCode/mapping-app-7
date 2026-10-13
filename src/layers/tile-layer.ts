import { PbfReader } from "pbf";
import { VectorTile } from "@mapbox/vector-tile";
import { PMTiles } from "pmtiles";
import type { Bounds } from "../core/math/bounds/bounds";
import type { Viewport } from "../core/viewport";
import { updateDebugSubBox } from "../debug/debug-box";
import { applyStyle, resolveStyle } from "../styles/style-rule";
import { Layer, type LayerOptions } from "./layer";


export type TileLayerOptions = Partial<LayerOptions> & {
    path: string;
    sourceLayer: string;
    maxCachedTiles?: number;
};

interface TileData {
    path: Path2D | null;
    left: number;
    top: number;
    size: number;
    /** Vertices in the Path2D after decimation. */
    points: number;
    /** Vertices in the source tile before decimation. */
    rawPoints: number;
}

/**
 * Vertices closer than this (in tile units, out of the tile's 4096-ish extent) to the last
 * kept vertex are dropped. 2 units is about half a device pixel at the worst-case magnification
 * within a tile zoom level. Set to 0 to disable. If you zoom well past the archive's max zoom
 * you may see faceted edges; lower it if so.
 */
const MIN_STEP = 4;

const EMPTY: TileData = { path: null, left: 0, top: 0, size: 0, points: 0, rawPoints: 0 };
const key = (z: number, x: number, y: number) => `${z}/${x}/${y}`;


export class TileLayer extends Layer {
    path: string;
    sourceLayer: string;
    maxCachedTiles: number;
    tileArchive!: PMTiles;
    cachedTiles = new Map<string, TileData>();
    baseTiles = new Map<string, TileData>();
    loadingTiles = new Set<string>();

    minTileZoom: number = 0;
    maxTileZoom: number = 0;

    baseTileLayer: number = 3;

    private lastStats = "";

    constructor(options: TileLayerOptions) {
        super(options);
        this.path = options.path;
        this.sourceLayer = options.sourceLayer;
        this.maxCachedTiles = options.maxCachedTiles ?? 300;
    }

    async load(): Promise<void> {
        // URL relative to the served page (not the src/data folder)
        const url = new URL("./data/" + this.path, document.baseURI).href;
        this.tileArchive = new PMTiles(url);
        const header = await this.tileArchive.getHeader();
        this.minTileZoom = header.minZoom;
        this.maxTileZoom = header.maxZoom;


        const jobs: Promise<void>[] = [];

        for (let z = this.minTileZoom; z <= Math.min(this.baseTileLayer, this.maxTileZoom); z++) {
            const n = 2 ** z;
            for (let x = 0; x < n; x++) {
                for (let y = 0; y < n; y++) jobs.push(this.loadBaseTile(z, x, y));
            }
        }
        await Promise.all(jobs);
        this.ready = true;

    }


    async loadBaseTile(z: number, x: number, y: number): Promise<void> {
        const res = await this.tileArchive.getZxy(z, x, y);
        this.baseTiles.set(key(z, x, y), res ? this.prepareTile(res.data, z, x, y) : EMPTY);
    }

    lookup(z: number, x: number, y: number): TileData | undefined {
        const k = key(z, x, y);
        return this.baseTiles.get(k) ?? this.cachedTiles.get(k);
    }

    render(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-Math.PI, -Math.PI, 2 * Math.PI, 2 * Math.PI);
        ctx.clip();

        const zoom = viewport.convertScaleToZoom(viewport.scale);
        const z = Math.min(this.maxTileZoom, Math.max(this.minTileZoom, Math.floor(zoom)));
        const { x0, x1, y0, y1 } = tileRange(viewport.visibleBounds, z);

        const exact: TileData[] = [];
        const fallbacks = new Set<TileData>();

        for (let x = x0; x <= x1; x++) {
            for (let y = y0; y <= y1; y++) {
                const tile = this.getTile(z, x, y);
                if (tile) exact.push(tile);
                else {
                    const ancestor = this.findAncestor(z, x, y);
                    if (ancestor) fallbacks.add(ancestor);
                }
            }
        }

        // Debug readout: how much geometry is being drawn this frame (only touches the DOM on change)
        let kept = 0, raw = 0;
        for (const t of fallbacks) { kept += t.points; raw += t.rawPoints; }
        for (const t of exact) { kept += t.points; raw += t.rawPoints; }
        const stats = `${this.name}: z${z}, ${exact.length} tiles + ${fallbacks.size} fallback, ${kept}/${raw} pts`;
        if (stats !== this.lastStats) {
            this.lastStats = stats;
            updateDebugSubBox(`${this.name}-tiles`, stats);
        }

        for (const tile of fallbacks) this.draw(ctx, tile, zoom, viewport.scale);
        for (const tile of exact) this.draw(ctx, tile, zoom, viewport.scale);


        // UNCOMMENT TO SHOW TILE BOUNDARY LINES
        // const n = 2 ** z;
        // const size = (2 * Math.PI) / n;
        // ctx.strokeStyle = "red";
        // ctx.lineWidth = 1 / viewport.scale;
        // for (let x = x0; x <= x1; x++) {
        //     for (let y = y0; y <= y1; y++) {
        //         const left = (x / n) * 2 * Math.PI - Math.PI;
        //         const top = Math.PI - (y / n) * 2 * Math.PI;
        //         ctx.strokeRect(left, top - size, size, size);
        //     }
        // }
        ctx.restore();
    }

    draw(ctx: CanvasRenderingContext2D, tile: TileData, zoom: number, scale: number): void {
        if (!this.style || !tile.path) return;

        const style = resolveStyle(this.style, zoom, {});
        if (!style) return;

        ctx.save();
        const e = 0.5 / scale;
        ctx.beginPath();
        ctx.rect(tile.left - e, tile.top - tile.size - e, tile.size + 2 * e, tile.size + 2 * e);
        ctx.clip();

        applyStyle(ctx, style, scale);

        if (style.fillStyle) ctx.fill(tile.path, "evenodd");
        if (style.strokeStyle) ctx.stroke(tile.path);
        ctx.restore();
    }

    getTile(z: number, x: number, y: number): TileData | undefined {
        const k = key(z, x, y);
        const cached = this.cachedTiles.get(k);
        if (cached) {
            this.cachedTiles.delete(k);
            this.cachedTiles.set(k, cached);
            return cached;
        }
        if (!this.loadingTiles.has(k)) {
            this.loadingTiles.add(k);
            void this.fetchTile(z, x, y, k);
        }
        return undefined;
    }

    findAncestor(z: number, x: number, y: number): TileData | undefined {
        for (let az = z - 1; az >= this.minTileZoom; az--) {
            const shift = z - az;
            const tile = this.lookup(az, x >> shift, y >> shift);
            if (tile) return tile;
        }
        return undefined;
    }

    async fetchTile(z: number, x: number, y: number, k: string): Promise<void> {
        try {
            const res = await this.tileArchive.getZxy(z, x, y);
            this.cachedTiles.set(k, res ? this.prepareTile(res.data, z, x, y) : EMPTY);
        } catch (e) {
            console.error(`[${this.name}] tile ${k} failed`, e);
            this.cachedTiles.set(k, EMPTY);
        } finally {
            this.loadingTiles.delete(k);
        }

        while (this.cachedTiles.size > this.maxCachedTiles) {
            this.cachedTiles.delete(this.cachedTiles.keys().next().value!);
        }
        this.onChange();
    }

    prepareTile(buffer: ArrayBuffer, z: number, x: number, y: number): TileData {
        const layer = new VectorTile(new PbfReader(buffer)).layers[this.sourceLayer];
        if (!layer) return EMPTY;

        const n = 2 ** z;

        const worldX = (px: number) => ((x + px / layer.extent) / n) * 2 * Math.PI - Math.PI;
        const worldY = (py: number) => Math.PI - ((y + py / layer.extent) / n) * 2 * Math.PI;

        const path = new Path2D();
        // MIN_STEP is defined for a 4096-unit extent; scale it to this tile's actual extent
        // (tippecanoe's --low-detail can produce smaller extents at lower zooms).
        const step = MIN_STEP * (layer.extent / 4096);
        const minSq = step * step;
        const keep: number[] = [];
        let points = 0;
        let rawPoints = 0;

        for (let i = 0; i < layer.length; i++) {
            const feature = layer.feature(i);
            if (feature.type !== 2 && feature.type !== 3) continue;
            const isPolygon = feature.type === 3;

            for (const ring of feature.loadGeometry()) {
                if (ring.length < 2) continue;
                rawPoints += ring.length;

                // Drop vertices within MIN_STEP of the last kept one (sub-pixel detail).
                // The first and last vertices are always kept so rings stay closed.
                keep.length = 0;
                keep.push(0);
                let lx = ring[0].x, ly = ring[0].y;
                for (let j = 1; j < ring.length - 1; j++) {
                    const dx = ring[j].x - lx, dy = ring[j].y - ly;
                    if (dx * dx + dy * dy < minSq) continue;
                    keep.push(j);
                    lx = ring[j].x;
                    ly = ring[j].y;
                }
                keep.push(ring.length - 1);

                if (isPolygon && keep.length < 4) continue; // collapsed to a sub-pixel sliver

                for (let k = 0; k < keep.length; k++) {
                    const p = ring[keep[k]];
                    if (k === 0) path.moveTo(worldX(p.x), worldY(p.y));
                    else path.lineTo(worldX(p.x), worldY(p.y));
                }
                if (isPolygon) path.closePath();
                points += keep.length;
            }
        }

        return { path, left: worldX(0), top: worldY(0), size: (2 * Math.PI) / n, points, rawPoints };
    }
}


function tileRange(bounds: Bounds, z: number) {
    const n = 2 ** z;
    const clamp = (v: number) => Math.min(n - 1, Math.max(0, v));
    const worldSize = 2 * Math.PI;
    return {
        x0: clamp(Math.floor(((bounds.minCorner.x + Math.PI) / worldSize) * n)),
        x1: clamp(Math.floor(((bounds.maxCorner.x + Math.PI) / worldSize) * n)),
        y0: clamp(Math.floor(((Math.PI - bounds.maxCorner.y) / worldSize) * n)), // top edge = max world y
        y1: clamp(Math.floor(((Math.PI - bounds.minCorner.y) / worldSize) * n)),
    };
}