import { FisherYatesShuffle } from "$lib/common/Randomization/Randomization.ts";
import fem1 from "./webp/fem/fem1.webp";
import fem2 from "./webp/fem/fem2.webp";
import masc1 from "./webp/masc/masc1.webp";
import masc2 from "./webp/masc/masc2.webp";

export interface Avatar {
    name: string;
    path: string;
}

const avatars: Avatar[] = [
    { name: "fem1", path: fem1 },
    { name: "fem2", path: fem2 },
    { name: "masc1", path: masc1 },
    { name: "masc2", path: masc2 },
];

export const shuffledAvatars: Avatar[] = FisherYatesShuffle(avatars);

export function getAvatar(): Avatar | null {
    const name = localStorage.getItem("selectedAvatar") ?? null;
    if (!name) return null;
    return avatars.find((avatar: Avatar) => avatar.name === name) ?? null;
}

export function setAvatar(avatar: Avatar) {
    if (!avatar) return;
    localStorage.setItem("selectedAvatar", avatar.name);
}
