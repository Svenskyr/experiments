import type { SyncHandler } from "./SyncHandler";
import { submit as submitFeedback } from "../../_database/FeedbackDBM.ts";
import { submit as submitPageTimeRecord } from "../../_database/PageTimeTrackerDBM.ts";
import { submit as submitComprehensionQuestion } from "../../_database/ComprehensionQuestionDBM.ts";
import { submit as submitRangeSetQuestion } from "../../_database/RangeSetQuestionDBM.ts";
import { submit as submitSurveyMultipleChoiceQuestion } from "../../_database/SurveyMultipleChoiceQuestionDBM.ts";
import { submit as submitGameRounds } from "../../_database/CCGGameDBM.ts";

export interface PostgrestError {
    message: string;
    details: string;
    hint: string;
    code: string;
}

export const Actions = {
    submitFeedback,
    submitPageTimeRecord,
    submitComprehensionQuestion,
    submitRangeSetQuestion,
    submitSurveyMultipleChoiceQuestion,
    submitGameRounds,
};

export const notReadyError = (): PostgrestError => {
    return {
        message: "SyncHandler not ready",
        details: "Either syncHandler.db or syncHandler.authUserId is not set",
        hint: "Call syncHandler.initDb() to initialize the database connection",
        code: "400",
    };
};

export const noPayloadError = (key: string): PostgrestError => {
    return {
        message: "No payload found",
        details: `No payload found for key: ${key}`,
        hint: "Call save() to save the data",
        code: "400",
    };
};
