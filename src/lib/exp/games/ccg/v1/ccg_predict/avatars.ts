import type { Avatar } from "./types.d.ts";

import fem1 from "./avatars/webp/fem/fem1.webp";
import fem2 from "./avatars/webp/fem/fem2.webp";
import fem3 from "./avatars/webp/fem/fem3.webp";
import fem4 from "./avatars/webp/fem/fem4.webp";
import fem5 from "./avatars/webp/fem/fem5.webp";
import fem6 from "./avatars/webp/fem/fem6.webp";

import masc1 from "./avatars/webp/masc/masc1.webp";
import masc2 from "./avatars/webp/masc/masc2.webp";
import masc3 from "./avatars/webp/masc/masc3.webp";
import masc4 from "./avatars/webp/masc/masc4.webp";
import masc5 from "./avatars/webp/masc/masc5.webp";

export const avatars: Avatar[] = [
    { name: "fem1", path: fem1 },
    // { name: "fem2", path: fem2 },
    // { name: "fem5", path: fem5 },
    { name: "fem6", path: fem6 },
    // { name: "masc1", path: masc1 },
    // { name: "masc2", path: masc2 },
    { name: "masc3", path: masc3 },
    { name: "masc4", path: masc4 },
    // { name: "masc5", path: masc5 },
];

export function setAvatar(avatar: Avatar) {
    localStorage.setItem("selectedAvatar", avatar.name);
}

export function getAvatar(): Avatar | null {
    const storedAvatarName = localStorage.getItem("selectedAvatar");
    if (!storedAvatarName) return null;
    return avatars.find((avatar: Avatar) => avatar.name === storedAvatarName) ?? null;
}

export function shuffleAvatars(avatars: Avatar[]): Avatar[] {
    return avatars.sort(() => Math.random() - 0.5);
}
