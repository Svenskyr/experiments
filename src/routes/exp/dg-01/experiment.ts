import type { ExperimentDefinition } from "#lib/exp/state/v1/Pages.ts";

export const STUDY_ID = "dg-01";
export const EXPERIMENT_ID = "exp_dg_01";
export const BASE_PATH = `/exp/${STUDY_ID}`;
export const STORAGE_PREFIX = `${EXPERIMENT_ID}:`;

export const PAGE_ORDER = [
    "", // Gate
    "consent",
    "avatar",
    "instructions",
    "decision",
    "end",
] as const;

export type PageName = (typeof PAGE_ORDER)[number];

export const EXPERIMENT: ExperimentDefinition<PageName> = {
    studyId: STUDY_ID,
    experimentId: EXPERIMENT_ID,
    basePath: BASE_PATH,
    storagePrefix: STORAGE_PREFIX,
    pageOrder: PAGE_ORDER,
};
