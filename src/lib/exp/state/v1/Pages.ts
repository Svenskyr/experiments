import { pageNameFromRoute as lastPathSegment } from "#lib/common/PageFunctions/v1/PageFunctions.ts";

/** An experiment's constants. `P` is the union of its page names. */
export interface ExperimentDefinition<P extends string = string> {
    studyId: string; // URL and folder name: "ccg-01"
    experimentId: string; // Postgres schema: "exp_ccg_01"
    basePath: string; // "/exp/ccg-01"
    storagePrefix: string; // Prefix of every localStorage key: "exp_ccg_01:"
    pageOrder: readonly P[]; // The participant flow. The first page is the gate, "".
}

export interface PageState {
    permitted: boolean;
    completed: boolean;
}

export type PageStates = Partial<Record<string, PageState>>;

export function pagePath(experiment: ExperimentDefinition, page: string): string {
    return page === "" ? experiment.basePath : `${experiment.basePath}/${page}`;
}

/** The furthest permitted page, or the gate if none is permitted. */
export function maxPage<P extends string>(
    experiment: ExperimentDefinition<P>,
    pageStates: PageStates,
): P {
    return experiment.pageOrder.findLast((page) => pageStates[page]?.permitted)
        ?? experiment.pageOrder[0];
}

/** The nearest permitted pages before and after `currentPage`. The gate stands for "none". */
export function findAdjacentPermittedPages<P extends string>(
    experiment: ExperimentDefinition<P>,
    pageStates: PageStates,
    currentPage: P,
): { previousPage: P; nextPage: P; maxPage: P } {
    const { pageOrder } = experiment;
    const currentIndex = pageOrder.indexOf(currentPage);
    return {
        previousPage: pageOrder.findLast(
            (page, index) => index < currentIndex && pageStates[page]?.permitted,
        ) ?? pageOrder[0],
        nextPage: pageOrder.find(
            (page, index) => index > currentIndex && pageStates[page]?.permitted,
        ) ?? pageOrder[0],
        maxPage: maxPage(experiment, pageStates),
    };
}

/** The page a pathname names, or the gate if it names none. */
export function pageNameFromRoute<P extends string>(
    experiment: ExperimentDefinition<P>,
    pathname: string,
): P {
    const segment = lastPathSegment(pathname);
    return experiment.pageOrder.find((page) => page === segment) ?? experiment.pageOrder[0];
}
