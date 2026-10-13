import { updateDebugSubBox } from "../debug/debug-box";
import type { Bounds } from "./math/bounds/bounds";
import type { ScreenCoordinates } from "./math/coordinates/coordinate-types";

export const TILE_SIZE = 256;
const WORLD_RADIANS = 2 * Math.PI;
const INITIAL_ZOOM = 1.5;

/**
 * Zoom levels moved per mouse-wheel notch. Zoom always lands on a multiple of this, so pick a
 * value that divides 1 (0.25, 0.5, 1) if you want whole zoom levels, where tiles are drawn at
 * their native resolution, to be reachable.
 */
const ZOOM_STEP = 0.25;
/** Wheel delta, in pixels, that counts as one notch. A typical mouse wheel notch is 100. */
const WHEEL_NOTCH = 100;
/** Leftover partial scroll (e.g. from a trackpad) is forgotten after this long without wheel events. */
const WHEEL_RESET_MS = 200;


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

    /**
     * Zooms by a whole number of ZOOM_STEPs (positive = in, negative = out), landing exactly on a
     * multiple of ZOOM_STEP. If the current zoom is between two multiples, the first step goes to
     * the next multiple in that direction. The point under (sx, sy) stays fixed on screen.
     */
    zoomStepsAtPoint(point: ScreenCoordinates, steps: number): void {
        const EPS = 1e-6; // so float noise like 5.999999999 still counts as "on the grid"
        const k = this.convertScaleToZoom(this.scale) / ZOOM_STEP;
        const index = steps > 0 ? Math.floor(k + EPS) + steps : Math.ceil(k - EPS) + steps;
        const target = this.convertZoomToScale(index * ZOOM_STEP);
        this.updateScaleAtPoint(point, target / this.scale);
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

        // Wheel events report different amounts depending on the device: a mouse notch is ~100 px in
        // Chrome but 3 lines in Firefox, and trackpads send many small deltas. We normalise to pixels
        // and add them up, so every WHEEL_NOTCH of scrolling is exactly one ZOOM_STEP.
        let wheelAccum = 0;
        let lastWheelTime = 0;

        const onMouseWheel = (e: WheelEvent) => {
            e.preventDefault();

            // deltaMode: 0 = pixels, 1 = lines (3 per notch), 2 = pages
            const pixels = e.deltaY * (e.deltaMode === 1 ? WHEEL_NOTCH / 3 : e.deltaMode === 2 ? 800 : 1);

            if (e.timeStamp - lastWheelTime > WHEEL_RESET_MS) wheelAccum = 0;
            lastWheelTime = e.timeStamp;

            wheelAccum += pixels;
            const notches = Math.trunc(wheelAccum / WHEEL_NOTCH);
            if (notches === 0) return;
            wheelAccum -= notches * WHEEL_NOTCH;

            const rect = canvas.getBoundingClientRect();
            // deltaY > 0 means scrolling down, which zooms out
            this.zoomStepsAtPoint({ x: e.clientX - rect.left, y: e.clientY - rect.top }, -notches);
            onChange();
        }


        canvas.addEventListener('pointerdown', onMouseDown);
        canvas.addEventListener('pointermove', onMouseMove);
        canvas.addEventListener('pointerup', onMouseUp);
        canvas.addEventListener("pointercancel", onMouseUp);
        canvas.addEventListener('wheel', onMouseWheel);
    }

    debugBox(): void {
        updateDebugSubBox('Zoom', `Zoom: ${this.convertScaleToZoom(this.scale).toFixed(2)}`);

    }
}