import { doBoundsIntersect, offsetBounds, type Bounds } from "../core/math/bounds/bounds";
import { Viewport } from "../core/viewport";
import { addLayerToggle } from "../debug/layer-toggles";
import type { LabelQueueEntry } from "../labels/labels-types";
import type { Layer } from "../layers/layer";
import { applyStyle } from "../styles/style-rule";

const MARKER_PADDING = 5;

const LOGGING_TAG = "[Main Map]";
export class GeoMap {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    layers: Layer[] = [];
    viewport: Viewport;
    redraw: boolean = true;
    loggingEnabled: boolean = false;

    labelQueue: LabelQueueEntry[] = [];

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

        for (const layer of this.layers) {
            layer.onChange = () => this.requestRedraw();
            addLayerToggle(layer, () => this.requestRedraw());
        }
    }

    async load() {
        await Promise.all(this.layers.map(async layer => {
            try { await layer.load(this.ctx); }
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

        this.labelQueue = [];

        const { ctx, viewport } = this;
        const dpr = window.devicePixelRatio || 1;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        ctx.setTransform(dpr * viewport.scale, 0, 0, -dpr * viewport.scale, dpr * viewport.translate.x, dpr * viewport.translate.y);
        for (const layer of this.layers) {
            if (!layer.ready || !layer.visible) continue;
            layer.render(ctx, viewport, this.labelQueue);
        }
        ctx.restore();

        this.renderLabelQueue();


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

    renderLabelQueue(): void {
        if (this.labelQueue.length == 0) return;
        const sorted = this.labelQueue.sort((a, b) => a.layerOffset - b.layerOffset || a.MIN_ZOOM - b.MIN_ZOOM);
        const placedBounds: Bounds[] = [];

        for (const entry of sorted) {
            const { lines, style, coordinates, MIN_ZOOM, bbox, lineHeight, layerOffset, marker } = entry;



            const point = {
                x: coordinates.x * this.viewport.scale + this.viewport.translate.x,
                y: -coordinates.y * this.viewport.scale + this.viewport.translate.y
            };

            const textPoint = {
                x: point.x,
                y: point.y,
            }


            let currentBounds = offsetBounds(bbox, point);
            let align: CanvasTextAlign = "center";

            if (marker) { // shift to side
                // try right first

                const leftShiftedBounds = offsetBounds(currentBounds, { x: -MARKER_PADDING - bbox.maxCorner.x, y: 0 });
                const overlap = placedBounds.some(placedBounds =>
                    doBoundsIntersect(leftShiftedBounds, placedBounds)
                );

                if (overlap) {
                    const rightShiftedBounds = offsetBounds(currentBounds, { x: MARKER_PADDING + bbox.maxCorner.x, y: 0 });
                    const overlap = placedBounds.some(placedBounds =>
                        doBoundsIntersect(rightShiftedBounds, placedBounds)
                    );

                    if (overlap) {
                        continue;
                    }

                    currentBounds = rightShiftedBounds;
                    currentBounds.maxCorner.x += MARKER_PADDING + marker.radii[marker.radii.length - 1];
                    textPoint.x = point.x + MARKER_PADDING + marker.radii[marker.radii.length - 1];
                    align = 'left';

                } else {
                    currentBounds = leftShiftedBounds;
                    currentBounds.minCorner.x += - MARKER_PADDING - marker.radii[marker.radii.length - 1];
                    textPoint.x = point.x - MARKER_PADDING - marker.radii[marker.radii.length - 1];

                    align = 'right';

                }

            } else {
                const overlap = placedBounds.some(placedBounds =>
                    doBoundsIntersect(currentBounds, placedBounds)
                );

                if (overlap) continue;

            }

            placedBounds.push(currentBounds);

            if (marker) {
                this.ctx.fillStyle = marker.fillColor;
                if (marker.strokeColor && marker.lineWidth) {
                    this.ctx.strokeStyle = marker.strokeColor;
                    this.ctx.lineWidth = marker.lineWidth;
                }

                this.ctx.beginPath();
                for (const radius of marker.radii) {
                    this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
                }
                this.ctx.closePath();
                this.ctx.fill('evenodd');
                if (marker.strokeColor && marker.lineWidth) {
                    this.ctx.stroke();
                }
            }


            applyStyle(this.ctx, style, 1);
            this.ctx.textAlign = align;
            this.ctx.textBaseline = 'middle';

            const lineCount = lines.length;
            lines.forEach((line, i) => {
                const y = point.y - (lineCount - 1) * lineHeight / 2 + i * lineHeight;
                if (style.strokeStyle) this.ctx.strokeText(line, textPoint.x, y);
                this.ctx.fillText(line, textPoint.x, y);
            })

        }
    }


}
