// export function pidSearchParam(source: URL | FormData): string {
//     const pid = source instanceof URL ? source.searchParams.get("PID") : source.get("PID");
//     if (!pid) return "";
//     return `?PID=${encodeURIComponent(String(pid))}`;
// }

// export function hasExtraSearchParams(url: URL): boolean {
//     return url.search !== pidSearchParam(url);
// }
