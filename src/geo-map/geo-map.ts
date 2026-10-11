import type { Layer } from "../layers/layer";

export class GeoMap {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    layers: Layer[] = [];
    constructor(canvas: HTMLCanvasElement, layers: Layer[] = []) {
        this.canvas = canvas;
        this.layers = layers;
        if (!this.canvas) throw new Error("Canvas not found");
        if (!this.canvas) throw new Error("Canvas not found");

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Context not found");

        this.ctx = ctx;
    }
    async load() {
        for (const layer of this.layers) {
            await layer.load();
        }
    }
}