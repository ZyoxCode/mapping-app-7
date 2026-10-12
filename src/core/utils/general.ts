export function mergeWithDefaults<T>(specified: Partial<T>, defaults: Required<T>): Required<T> {
    return { ...defaults, ...specified } as Required<T>;
}