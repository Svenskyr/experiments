// export function pageNameFromRoute(pathname: string): PageName {
//     const normalizedPath = pathname.replace(/\/+$/, "");
//     const segment = normalizedPath.split("/").pop() ?? "";
//     return PAGE_ORDER.includes(segment as PageName) ? (segment as PageName) : "";
// }

export function pageNameFromRoute(pathname: string): string {
    const normalizedPath = pathname.replace(/\/+$/, "");
    return normalizedPath.split("/").pop() ?? "";
}
