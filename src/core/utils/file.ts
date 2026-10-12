import shp from "shpjs";

export function toAbsoluteUrl(relativePath: string): string {
    return new URL(relativePath, window.location.href).href;
}

export async function pathExists(url: string): Promise<boolean> {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        return res.ok && !res.headers.get('content-type')?.includes('text/html');
    } catch {
        return false;
    }
}

export async function loadFile(path: string): Promise<any> {
    const split = (path).split(".")
    const fileExtension = split[split.length - 1];
    const absolute = toAbsoluteUrl('./data/' + path);

    let data: any;

    const exists = pathExists(absolute);
    if (!exists) throw new Error(`No file found at ${absolute}`);

    switch (fileExtension) {
        case "geojson":
            data = await fetch(absolute).then(res => res.json());
            break;
        case "zip":
            data = await shp(absolute);
            break;
        case "json":
            data = await (await fetch(absolute)).json();
            break;
        default:
            throw new Error(`File extension \'.${fileExtension}\' is not supported.`);
    };

    const collection = Array.isArray(data) ? data[0] : data;
    return collection;
}
