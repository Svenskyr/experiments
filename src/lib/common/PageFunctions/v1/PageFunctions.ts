export function pageNameFromRoute(pathname: string): string {
    const normalizedPath = pathname.replace(/\/+$/, "");
    return normalizedPath.split("/").pop() ?? "";
}
