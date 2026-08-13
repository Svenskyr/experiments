import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = Deno.env.get("PUBLIC_SUPABASE_URL") ?? "http://127.0.0.1:64321";
export const SERVICE_KEY = Deno.env.get("PRIVATE_SUPABASE_SERVICE_KEY")
    ?? Deno.env.get("PRIVATE_SUPABASE_SECRET_KEY");
export const TEST_PASSWORD = "test-password-123456";

export interface RegisteredSession {
    authUserId: string;
    sessionId: string;
    email: string;
    pid: string;
}

export function installLocalStorageMock(): void {
    const storage = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
        value: {
            getItem: (key: string) => storage.get(key) ?? null,
            setItem: (key: string, value: string) => storage.set(key, value),
            removeItem: (key: string) => storage.delete(key),
            clear: () => storage.clear(),
            key: (index: number) => [...storage.keys()][index] ?? null,
            get length() {
                return storage.size;
            },
        },
        writable: true,
        configurable: true,
    });
}

export function createServiceClient(): SupabaseClient {
    if (!SERVICE_KEY) {
        throw new Error("PRIVATE_SUPABASE_SERVICE_KEY is required");
    }
    return createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false },
    });
}

export class SessionRegistry {
    readonly #sessions: RegisteredSession[] = [];

    register(session: RegisteredSession): void {
        this.#sessions.push(session);
    }

    get sessions(): readonly RegisteredSession[] {
        return this.#sessions;
    }

    async cleanupAll(): Promise<void> {
        if (!SERVICE_KEY) return;

        const supabase = createServiceClient();
        for (const { authUserId, sessionId } of this.#sessions) {
            await cleanupSession(supabase, sessionId, authUserId);
        }
        this.#sessions.length = 0;
    }
}

export async function cleanupSession(
    supabase: SupabaseClient,
    sessionId: string,
    authUserId: string,
): Promise<void> {
    await supabase.schema("exp_ccg_01").from("survey").delete().eq("session_id", sessionId);
    await supabase.schema("exp_ccg_01").from("comprehension").delete().eq("session_id", sessionId);
    await supabase.schema("exp_ccg_01").from("game_rounds").delete().eq("session_id", sessionId);
    await supabase.schema("experiments").from("sessions").delete().eq("session_id", sessionId);
    await supabase.auth.admin.deleteUser(authUserId);
}

export interface SetupExperimentSessionOptions {
    pid: string;
    role?: string;
    source?: string;
    platform?: string;
    platformSessionId?: string;
    registry?: SessionRegistry;
}

export async function setupExperimentSession(
    options: SetupExperimentSessionOptions,
): Promise<RegisteredSession> {
    const {
        pid,
        role = "tester",
        source = "manual-test",
        platform = "",
        platformSessionId = "",
        registry,
    } = options;

    const supabase = createServiceClient();
    const authUserId = crypto.randomUUID();
    const email = `${pid}@test.local`;

    const { error: authError } = await supabase.auth.admin.createUser({
        id: authUserId,
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
    });
    if (authError) throw new Error(`createUser: ${authError.message}`);

    const { data: registration, error: registrationError } = await supabase
        .schema("experiments")
        .rpc("register_for_experiment", {
            p_request: {
                experiment_id: "exp_ccg_01",
                auth_id: authUserId,
                pid,
                source,
                platform,
                platform_session_id: platformSessionId,
                role,
            },
        })
        .single<{ user_id: string; session_id: string }>();
    if (registrationError) {
        throw new Error(`register_for_experiment: ${registrationError.message}`);
    }
    if (!registration?.session_id) {
        throw new Error("register_for_experiment returned no session_id");
    }

    const registered: RegisteredSession = {
        authUserId,
        sessionId: registration.session_id,
        email,
        pid,
    };
    registry?.register(registered);
    return registered;
}

export async function signInParticipant(
    email: string,
): Promise<{ client: SupabaseClient; authUserId: string }> {
    const pubKey = Deno.env.get("PUBLIC_SUPABASE_PUB_KEY")
        ?? Deno.env.get("PUBLIC_SUPABASE_PUBLIC_KEY");
    if (!pubKey) {
        throw new Error("PUBLIC_SUPABASE_PUB_KEY is required for authenticated client");
    }

    const admin = createServiceClient();
    const { data, error } = await admin.auth.signInWithPassword({
        email,
        password: TEST_PASSWORD,
    });
    if (error) throw new Error(`signIn: ${error.message}`);
    if (!data.session?.user?.id) {
        throw new Error("signIn returned no session");
    }

    const client = createClient(SUPABASE_URL, pubKey, {
        auth: { persistSession: false },
    });
    const { error: sessionError } = await client.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
    });
    if (sessionError) throw new Error(`setSession: ${sessionError.message}`);

    return { client, authUserId: data.session.user.id };
}

export function clearCCGGameLocalStorage(): void {
    localStorage.removeItem("exp_ccg_01:ccg-game");
    localStorage.removeItem("exp_ccg_01:game-rounds");
    localStorage.removeItem("ccg-v2-permutationTracker");
    localStorage.removeItem("selectedAvatar");
}
