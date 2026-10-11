import type { MercatorCoordinates } from "../core/math/coordinates/coordinate-types";
import { triangleArea } from "../core/math/vectors/utils";


export interface CoordinateWithImportance {
    coordinates: MercatorCoordinates;
    importance: number;
}

export function buildRing(ring: MercatorCoordinates[], closed = false): CoordinateWithImportance[] {

    if ((closed && ring.length <= 3) || (!closed && ring.length <= 2)) {
        return ring.map((point) => ({
            coordinates: point, importance: Infinity
        }
        ));
    }
    const newRing: CoordinateWithImportance[] = [];

    for (let i = 0; i < ring.length; i++) {
        let prev = ring[(i - 1 + ring.length) % ring.length];
        let current = ring[i];
        let next = ring[(i + 1) % ring.length]
        if (!closed && (i == 0 || i == ring.length - 1)) {
            newRing.push({ coordinates: current, importance: Infinity });
        } else {
            newRing.push({ coordinates: current, importance: triangleArea(prev, current, next) });
        }
    }

    return newRing;
}

class MinHeap {
    private keys: number[] = [];
    private vals: number[] = [];

    get size() { return this.keys.length; }
    peekKey() { return this.keys[0]; }

    push(key: number, val: number) {
        const keys = this.keys, vals = this.vals;
        let i = keys.length;
        keys.push(key);
        vals.push(val);
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (keys[parent] <= key) break;
            keys[i] = keys[parent];
            vals[i] = vals[parent];
            i = parent;
        }
        keys[i] = key;
        vals[i] = val;
    }

    /** Removes the smallest entry and returns its value. */
    pop(): number {
        const keys = this.keys, vals = this.vals;
        const top = vals[0];
        const lastKey = keys.pop()!;
        const lastVal = vals.pop()!;
        const n = keys.length;
        if (n > 0) {
            let i = 0;
            while (true) {
                let child = 2 * i + 1;
                if (child >= n) break;
                if (child + 1 < n && keys[child + 1] < keys[child]) child++;
                if (keys[child] >= lastKey) break;
                keys[i] = keys[child];
                vals[i] = vals[child];
                i = child;
            }
            keys[i] = lastKey;
            vals[i] = lastVal;
        }
        return top;
    }
}

export class RingSimplifier {
    private readonly points: MercatorCoordinates[];
    private readonly importance: Float64Array;
    private readonly prev: Int32Array;
    private readonly next: Int32Array;
    private readonly alive: Uint8Array;
    private readonly heap = new MinHeap();
    private head = 0;
    private count: number;
    private closed: boolean;

    constructor(ring: CoordinateWithImportance[], closed: boolean = false) {
        const n = ring.length;
        this.closed = closed
        this.count = n;
        this.points = new Array(n);
        this.importance = new Float64Array(n);
        this.prev = new Int32Array(n);
        this.next = new Int32Array(n);
        this.alive = new Uint8Array(n).fill(1);
        for (let i = 0; i < n; i++) {
            this.points[i] = ring[i].coordinates;
            const isEndpoint = !closed && (i === 0 || i === n - 1);
            const imp = isEndpoint ? Infinity : ring[i].importance;
            this.importance[i] = imp;
            this.prev[i] = (i - 1 + n) % n;
            this.next[i] = (i + 1) % n;
            if (Number.isFinite(imp)) this.heap.push(imp, i);
        }
    }

    /** Removes vertices with importance below the threshold, never going under 3 vertices. */
    simplify(threshold: number): void {
        const heap = this.heap;
        while ((this.closed ? this.count > 3 : this.count > 2) && heap.size > 0 && heap.peekKey() < threshold) {
            const key = heap.peekKey();
            const idx = heap.pop();
            if (!this.alive[idx] || key !== this.importance[idx]) continue; // stale entry
            this.remove(idx);
        }
    }

    /** Returns the current vertices in order, as a fresh array. */
    snapshot(): MercatorCoordinates[] {
        const out: MercatorCoordinates[] = new Array(this.count);
        let i = this.head;
        for (let k = 0; k < this.count; k++) {
            out[k] = this.points[i];
            i = this.next[i];
        }
        return out;
    }

    private remove(idx: number): void {
        const p = this.prev[idx], n = this.next[idx];

        // Safely update linked list without referencing -1 indices
        if (p !== -1) this.next[p] = n;
        if (n !== -1) this.prev[n] = p;

        this.alive[idx] = 0;
        this.count--;
        if (this.head === idx) this.head = n;

        if (p !== -1) this.refresh(p);
        if (n !== -1) this.refresh(n);
    }

    private refresh(i: number): void {
        // 3. Do not re-evaluate endpoints or Coordinates that lost neighbors in open lines
        if (!Number.isFinite(this.importance[i])) return;

        const p = this.prev[i];
        const n = this.next[i];

        // If either adjacent neighbor is missing (end of open line), cannot compute triangle area
        if (p === -1 || n === -1) return;

        const imp = triangleArea(this.points[p], this.points[i], this.points[n]);
        this.importance[i] = imp;
        this.heap.push(imp, i);
    }
}