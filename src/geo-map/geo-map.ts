import { Viewport } from "../core/viewport";
import type { Layer } from "../layers/layer";

const LOGGING_TAG = "[Main Map]";
export class GeoMap {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    layers: Layer[] = [];
    viewport: Viewport;
    redraw: boolean = true;
    loggingEnabled: boolean = false;

    constructor(canvas: HTMLCanvasElement, layers: Layer[] = [], loggingEnabled: boolean = false) {
        this.canvas = canvas;
        this.layers = layers;
        if (!this.canvas) throw new Error("Canvas not found");

        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Context not found");

        this.ctx = ctx;

        this.viewport = new Viewport(canvas.width, canvas.height);
        this.viewport.debugBox();

        this.loggingEnabled = loggingEnabled;
    }

    async load() {
        await Promise.all(this.layers.map(async layer => {
            try { await layer.load(); }
            catch (e) { console.error(`[${layer.name}] failed to load`, e); }
            this.requestRedraw();
        }));
    }

    async start() {
        this.syncCanvasSize();
        this.log("----- Starting -----");

        this.log("Attaching viewport event listeners");
        this.viewport.attach(this.canvas, () => this.requestRedraw());

        this.log("Attaching canvas resize observer");
        const observer = new ResizeObserver(() => {
            this.syncCanvasSize();
            this.requestRedraw();
        });
        observer.observe(this.canvas);

        this.log("Starting render loop");
        requestAnimationFrame(this.renderLoop);


    }

    renderLoop = (): void => {
        if (this.redraw) {
            this.redraw = false;
            this.render();
        }
        requestAnimationFrame(this.renderLoop);
    }

    render(): void {

        const { ctx, viewport } = this;
        const dpr = window.devicePixelRatio || 1;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.setTransform(dpr * viewport.scale, 0, 0, -dpr * viewport.scale, dpr * viewport.translate.x, dpr * viewport.translate.y);
        for (const layer of this.layers) {
            if (!layer.ready) continue;
            layer.render(ctx, viewport);
        }
        ctx.restore();
    }

    syncCanvasSize(): void {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.viewport.resize(this.canvas.width, this.canvas.height);
    }

    requestRedraw(): void {
        this.redraw = true;
    }

    log(message: string): void {
        if (this.loggingEnabled) console.log(`${LOGGING_TAG} ${message}`);
    }

}