const DEBUG_BOX = document.getElementById("debug-box") as HTMLDivElement;
if (!DEBUG_BOX) throw new Error("DEBUG_BOX not found");

/**
 * Updates or creates a sub-box inside the debug container.
 * @param name Unique identifier for the sub-box (e.g., 'bounds', 'translate')
 * @param text The text content to display
 */
export function updateDebugSubBox(name: string, text: string): void {
    const subBoxId = `debug-${name}`;
    let subBox = document.getElementById(subBoxId) as HTMLDivElement;

    if (!subBox) {
        subBox = document.createElement("div");
        subBox.id = subBoxId;
        DEBUG_BOX.appendChild(subBox);
    }

    subBox.innerText = text;
}