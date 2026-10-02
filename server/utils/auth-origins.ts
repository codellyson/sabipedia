export function allowedAuthOrigins(baseURL?: string, extraOrigins = '') {
 const origins = [baseURL, ...extraOrigins.split(',')].filter((value): value is string => Boolean(value?.trim()))
 return [...new Set(origins.map(value => new URL(value.trim()).origin))]
}
