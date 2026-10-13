import type { Layer } from "../layers/layer";

const LAYER_TOGGLES = document.getElementById("layer-toggles") as HTMLDivElement;
if (!LAYER_TOGGLES) throw new Error("LAYER TOGGLES not found");

/**
 * Adds a clickable entry to the layer-toggles box. Clicking flips `layer.visible`
 * and calls `onChange` so the map can redraw.
 */
export function addLayerToggle(layer: Layer, onChange: () => void): void {
    const el = document.createElement("div");
    el.className = "layer-toggle";

    const refresh = () => {
        el.textContent = `${layer.visible ? "☑" : "☐"} ${layer.name}`;
        el.classList.toggle("off", !layer.visible);
    };

    el.addEventListener("click", () => {
        layer.visible = !layer.visible;
        refresh();
        onChange();
    });

    refresh();
    LAYER_TOGGLES.appendChild(el);
}