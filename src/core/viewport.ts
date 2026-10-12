import { updateDebugSubBox } from "../debug/debug-box";
import type { Bounds } from "./math/bounds/bounds";
import type { ScreenCoordinates } from "./math/coordinates/coordinate-types";

export const TILE_SIZE = 256;
const WORLD_RADIANS = 2 * Math.PI;
const INITIAL_ZOOM = 1.5;
const ZOOM_STEP = 0.0015;


export class Viewport {
    width: number;
    height: number;

    translate: ScreenCoordinates = { x: 0, y: 0 };
    last: ScreenCoordinates = { x: 0, y: 0 };
    down: ScreenCoordinates = { x: 0, y: 0 };

    scale: number;
    visibleBounds: Bounds;

    minScale: number;
    maxScale: number;

    dragging: boolean = false;


    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.translate = { x: width / 2, y: height / 2 };
        this.scale = this.convertZoomToScale(INITIAL_ZOOM);
        this.visibleBounds = { minCorner: { x: 0, y: 0 }, maxCorner: { x: 0, y: 0 } }

        this.minScale = this.convertZoomToScale(0);
        this.maxScale = this.convertZoomToScale(18);


    }

    convertZoomToScale(zoom: number): number {
        return (TILE_SIZE * 2 ** zoom) / WORLD_RADIANS;
    }

    convertScaleToZoom(scale: number): number {
        return Math.log2((scale * WORLD_RADIANS) / TILE_SIZE);
    }

    updateVisibleBounds(): void {
        this.visibleBounds.minCorner = {
            x: -this.translate.x / this.scale,
            y: (this.translate.y - this.height) / this.scale
        }
        this.visibleBounds.maxCorner = {
            x: (this.width - this.translate.x) / this.scale,
            y: this.translate.y / this.scale
        }

        this.debugBox();
    }

    updateTranslate({ x: dx, y: dy }: ScreenCoordinates): void {
        this.translate.x += dx;
        this.translate.y += dy;
        this.updateVisibleBounds();
    }

    updateScaleAtPoint({ x: sx, y: sy }: ScreenCoordinates, factor: number): void {

        const next = Math.min(this.maxScale, Math.max(this.minScale, this.scale * factor));
        const ratio = next / this.scale;

        this.translate.x = sx - (sx - this.translate.x) * ratio;
        this.translate.y = sy - (sy - this.translate.y) * ratio;

        this.scale = next;

        this.updateVisibleBounds();
    }

    resize(width: number, height: number): void {
        this.updateTranslate({ x: (width - this.width) / 2, y: (height - this.height) / 2 });
        this.height = height;
        this.width = width;
        this.updateVisibleBounds();
    }


    attach(canvas: HTMLCanvasElement, onChange: () => void = () => { }): void {
        // onChange is used to request a re-render on the map when panning or zooming

        const onMouseDown = (e: PointerEvent) => {
            this.dragging = true;
            this.last = { x: e.clientX, y: e.clientY };
            this.down = { x: e.clientX, y: e.clientY };
            canvas.setPointerCapture(e.pointerId);
        }

        const onMouseMove = (e: PointerEvent) => {
            if (!this.dragging) return;
            //const rect = canvas.getBoundingClientRect();
            this.updateTranslate({ x: e.clientX - this.last.x, y: e.clientY - this.last.y });
            this.last = { x: e.clientX, y: e.clientY };

            onChange();
        }

        const onMouseUp = (e: PointerEvent) => {
            // const wasDragging = this.dragging;
            this.dragging = false;
            canvas.releasePointerCapture(e.pointerId);

            // if (!wasDragging || e.type === 'pointercancel') return;
            // if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 4) return; // just a click not a pan;
        }

        const onMouseWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            this.updateScaleAtPoint(
                { x: e.clientX - rect.left, y: e.clientY - rect.top },
                Math.exp(-e.deltaY * ZOOM_STEP)
            )
            onChange();
        }


        canvas.addEventListener('pointerdown', onMouseDown);
        canvas.addEventListener('pointermove', onMouseMove);
        canvas.addEventListener('pointerup', onMouseUp);
        canvas.addEventListener("pointercancel", onMouseUp);
        canvas.addEventListener('wheel', onMouseWheel);
    }

    debugBox(): void {
        updateDebugSubBox('translate', `Translate: [${this.translate.x.toFixed(2)}, ${this.translate.y.toFixed(2)}]`);
        updateDebugSubBox('scale', `Scale: ${this.scale.toFixed(2)}`);
        updateDebugSubBox('bounds', `Visible Bounds: 
            [${this.visibleBounds.minCorner.x.toFixed(2)}, ${this.visibleBounds.minCorner.y.toFixed(2)}] -> 
            [${this.visibleBounds.maxCorner.x.toFixed(2)}, ${this.visibleBounds.maxCorner.y.toFixed(2)}]`);
    }
}