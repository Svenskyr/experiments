<script lang="ts">
import { avatarByName } from "./Avatar.ts";

let {
    name,
    alt,
    size = "large",
}: {
    name: string; // Avatar name; see AVATARS
    alt: string; // Whom the avatar represents, e.g. "Your avatar"
    size?: "small" | "large" | undefined;
} = $props();

const avatar = $derived(avatarByName(name));
</script>

{#if avatar}
    <img class="avatar {size}" src={avatar.path} {alt} />
{/if}

<style>
.avatar {
    display: block;
    height: auto;
    border-radius: 10px;
    &.large {
        width: 200px;
    }
    &.small {
        width: 100px;
    }
}
</style>
