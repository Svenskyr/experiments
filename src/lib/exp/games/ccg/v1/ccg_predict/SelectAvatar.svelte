<script lang="ts">
import { onMount } from "svelte";
import type { Avatar } from "./types.d.ts";
import { avatars, getAvatar, setAvatar, shuffleAvatars } from "./avatars.ts";

let { data } = $props();
const { onConfirm } = $derived(data);
let selectedAvatar = $state<Avatar | null>(getAvatar() ?? null);
let shuffledAvatars = $state<Avatar[]>([]);

onMount(() => {
    shuffledAvatars = shuffleAvatars(avatars);
});

function handleSelectAvatar(avatar: Avatar) {
    selectedAvatar = avatar;
}

function handleConfirm() {
    if (!selectedAvatar) return;
    setAvatar(selectedAvatar);
    onConfirm(selectedAvatar);
}
</script>

<h2>Select your avatar</h2>

<div class="select-avatar">
    {#each shuffledAvatars as avatar}
        <button
            class="avatar-button"
            onclick={() => handleSelectAvatar(avatar)}
            class:selected={selectedAvatar?.name === avatar.name}
        >
            <img src={avatar.path} alt={avatar.name} class="avatar-image" />
        </button>
    {/each}
</div>

{#if selectedAvatar}
    <button class="confirm-button" onclick={handleConfirm}>Confirm</button>
{/if}

<style>
.select-avatar {
    display: grid;
    grid-template-columns: repeat(2, 150px);
    gap: 1rem;
}

button.avatar-button {
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: 10px;
    &.selected {
        border: 4px solid light-dark(oklch(30% 0 0), oklch(60% 0 0));
    }
    &:hover&:not(.selected) {
        filter: brightness(0.8);
    }
}

img.avatar-image {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 10px;
}

button.confirm-button {
    margin: 1rem auto;
    padding: 0.5rem 0.5rem;
}
</style>
