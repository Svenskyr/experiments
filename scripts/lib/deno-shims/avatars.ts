export interface Avatar {
    name: string;
    path: string;
}

const avatars: Avatar[] = [
    { name: "fem1", path: "" },
    { name: "fem2", path: "" },
    { name: "masc1", path: "" },
    { name: "masc2", path: "" },
];

export const shuffledAvatars: Avatar[] = [...avatars];

export function getAvatar(): Avatar | null {
    const name = localStorage.getItem("selectedAvatar") ?? null;
    if (!name) return null;
    return avatars.find((avatar) => avatar.name === name) ?? null;
}

export function setAvatar(avatar: Avatar): void {
    if (!avatar) return;
    localStorage.setItem("selectedAvatar", avatar.name);
}
