import { drawAvatarNames } from "#lib/exp/avatars/v1/Avatar.ts";

/** Avatar names. See AVATARS in the avatars module. */
export interface AvatarAssignment {
    self: string; // Represents the participant
    other: string; // Represents the other player
}

/** Treatment assignment, fixed by the participant key. Every ordered pair of two different
avatars is equally likely, so the participant and the other player never share an avatar.
The assignment is derived, not stored: it can be rebuilt from the session at analysis. */
export function assignAvatars(participantKey: string): AvatarAssignment {
    const [self, other] = drawAvatarNames(participantKey, 2);
    return { self, other };
}
