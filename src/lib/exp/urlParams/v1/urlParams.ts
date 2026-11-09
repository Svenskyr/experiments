/**
 * Anything with iterable search params: `URL`, or SvelteKit's read-only `page.url`.
 */
export type UrlWithSearchParams = { readonly searchParams: Iterable<[string, string]> };

/** Reads a URL search param by case-insensitive key match. */
export function getSearchParam(url: UrlWithSearchParams, key: string): string | null {
    const normalizedKey = key.toLowerCase();
    for (const [paramKey, value] of url.searchParams) {
        if (paramKey.toLowerCase() === normalizedKey) return value;
    }
    return null;
}
