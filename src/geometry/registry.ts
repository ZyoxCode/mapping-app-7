import type { ZoomLevel } from '../core/zoom-levels';
import type { BuiltGeometry, BuiltGeometryMap, GeometryTypeCoordinateFormats, PreparedGeometry, PreparedGeometryMap, RawGeometryType } from './geometry-types'
export interface GeometryHandler<K extends keyof GeometryTypeCoordinateFormats> {
    prepare(rawGeometry: Extract<RawGeometryType, { type: K }>, zoomLevels: ZoomLevel[]): PreparedGeometryMap[K];
    build(prepared: PreparedGeometryMap[K]): BuiltGeometryMap[K];
}

const handlerRegistry = new Map<string, GeometryHandler<any>>();

export function setHandler<K extends keyof GeometryTypeCoordinateFormats>(
    type: K,
    handler: GeometryHandler<K>
): void {
    handlerRegistry.set(type, handler);
}

export function getHandler<K extends keyof GeometryTypeCoordinateFormats>(
    type: K
): GeometryHandler<K> {
    console.log(handlerRegistry);
    const handler = handlerRegistry.get(type);
    if (!handler) throw new Error(`No geometry type of name ${type} in handler registry`);
    return handler as GeometryHandler<K>;
}

export function prepareGeometry(rawGeometry: RawGeometryType, zoomLevels: ZoomLevel[]): PreparedGeometry | null {
    const handler = getHandler(rawGeometry.type);
    return handler.prepare(rawGeometry, zoomLevels) ?? null;
}

export function buildGeometry(preparedGeometry: PreparedGeometry): BuiltGeometry {
    const handler = getHandler(preparedGeometry.type);
    return handler.build(preparedGeometry);
}