import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
// import type { Database } from "./database.types.ts"; // import generated types
import type { Logger } from "pino";

declare global {
    namespace App {
        interface Locals {
            supabase: SupabaseClient<Database>;
            safeGetSession: () => Promise<
                { supabaseSession: Session | null; supabaseUser: User | null }
            >;
            supabaseSession: Session | null;
            supabaseUser: User | null;
            log: Logger;
        }
        interface PageData {
            supabaseSession: Session | null;
        }
        interface Window {
            turnstile?: {
                render: (
                    element: string | HTMLElement,
                    options: {
                        sitekey: string;
                        callback?: (token: string) => void;
                        "error-callback"?: () => void;
                        "expired-callback"?: () => void;
                    },
                ) => string;
                remove: (widgetId: string) => void;
            };
        }
    }
}

export {};
