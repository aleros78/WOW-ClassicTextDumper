export function normalizeString(str: string): string {
    if (!str) return '';

    // Convert all line endings to \n
    let normalized = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Trim whitespace from start and end
    normalized = normalized.trim();

    // Normalize multiple newlines? 
    // Requirements: "converte \r\n / \r -> \n", "trim ai bordi", "preserva placeholder WoW"
    // Does not say collapse internal spaces.

    return normalized;
}

export function normalizeObject(obj: any): any {
    if (typeof obj === 'string') {
        return normalizeString(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(normalizeObject);
    }
    if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                result[key] = normalizeObject(obj[key]);
            }
        }
        return result;
    }
    return obj;
}
