import debugLib from "debug";
const debug = debugLib("ccg-01:Pages");

export const PAGE_ORDER = [
    "",
    "quota",
    "consent",
    "registration",
    "game_description_1",
    "game_description_2",
    "game_play",
    "survey",
    "end",
] as const;

export type PageName = (typeof PAGE_ORDER)[number];

export interface PageState {
    permitted: boolean;
    completed: boolean;
}

export type PageStates = Partial<Record<PageName, PageState>>;

export function maxPage(pageStates: PageStates): PageName {
    return PAGE_ORDER.findLast((page) => pageStates[page]?.permitted) ?? "";
}

export function findAdjacentPermittedPages(
    pageStates: PageStates,
    currentPage: PageName,
): { previousPage: PageName; nextPage: PageName; maxPage: PageName } {
    const currentIndex = PAGE_ORDER.indexOf(currentPage);

    if (currentIndex === -1) {
        return {
            previousPage: "",
            nextPage: "",
            maxPage: maxPage(pageStates),
        };
    }

    return {
        previousPage: PAGE_ORDER.findLast(
            (page, index) => index < currentIndex && pageStates[page]?.permitted,
        ) ?? "",
        nextPage: PAGE_ORDER.find(
            (page, index) => index > currentIndex && pageStates[page]?.permitted,
        ) ?? "",
        maxPage: maxPage(pageStates),
    };
}

import { pageNameFromRoute as pageNameFromRouteCommon } from "$lib/common/PageFunctions/PageFunctions.ts";

export function pageNameFromRoute(pathname: string): PageName {
    const pageName = pageNameFromRouteCommon(pathname) as PageName;
    return PAGE_ORDER.includes(pageName) ? pageName : "";
}
