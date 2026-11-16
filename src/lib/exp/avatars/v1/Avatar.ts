import { FisherYatesShuffle } from "#lib/common/Randomization/v1/Randomization.ts";
import fem1 from "./webp/fem1.webp";
import fem2 from "./webp/fem2.webp";
import masc1 from "./webp/masc1.webp";
import masc2 from "./webp/masc2.webp";

export interface Avatar {
    name: string;
    path: string; // Image URL
}

/** Every avatar, in a fixed order. Seeded draws depend on this order: changing it is major. */
export const AVATARS: readonly Avatar[] = [
    { name: "fem1", path: fem1 },
    { name: "fem2", path: fem2 },
    { name: "masc1", path: masc1 },
    { name: "masc2", path: masc2 },
];

export function avatarByName(name: string): Avatar | null {
    return AVATARS.find((avatar) => avatar.name === name) ?? null;
}

/** Draw `count` different avatar names. Every ordered draw is equally likely; the same seed
always gives the same draw. */
export function drawAvatarNames(seed: string, count: number): string[] {
    const names = AVATARS.map((avatar) => avatar.name);
    return FisherYatesShuffle(names, `${seed}-avatars`).slice(0, count);
}
