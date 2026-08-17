/** Reads a URL search param by case-insensitive key match. */
export function getSearchParam(url: URL, key: string): string | null {
    const normalizedKey = key.toLowerCase();
    for (const [paramKey, value] of url.searchParams) {
        if (paramKey.toLowerCase() === normalizedKey) return value;
    }
    return null;
}
