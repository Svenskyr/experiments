/** @deprecated Use CCGGameDBM — kept for v2 game state compatibility */
export {
    applySyncedRids,
    getUnsynced,
    loadRounds as load,
    roundsStorageKey as storageKey,
    saveRoundRecord as save,
    submit,
    sync,
} from "./CCGGameDBM.ts";
