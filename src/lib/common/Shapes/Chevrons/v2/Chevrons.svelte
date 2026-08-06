<script lang="ts">
import {
    type Chevron,
    type ChevronPath,
    chevronsToPaths,
    chevronsViewBox,
    type TipStyle,
} from "./chevrons.ts";

/** Padding on the tip side, along the chevron's pointing axis. */
const VIEWBOX_PADDING_TIP = 0;
/** Extra padding on the rear (open) side. Increase to nudge the tip forward when centered. */
const VIEWBOX_PADDING_REAR = 0;
/** Padding on both sides perpendicular to the pointing axis. */
const VIEWBOX_PADDING_PERP = 0;

interface Props {
    chevrons: Chevron[]; // chevrons to draw
    spacing?: number; // spacing between chevrons
    root?: boolean; // whether to draw the chevrons as a root element
    paddingTip?: number; // overrides VIEWBOX_PADDING_TIP
    paddingRear?: number; // overrides VIEWBOX_PADDING_REAR
    paddingPerp?: number; // overrides VIEWBOX_PADDING_PERP
    tipStyle?: TipStyle; // back arm tip shape: square, sharp, or flat
    transform?: string; // transform to apply to the chevrons
    class?: string; // class to apply to the chevrons
    style?: string; // style to apply to the chevrons
}

let {
    chevrons,
    root = false,
    paddingTip = VIEWBOX_PADDING_TIP,
    paddingRear = VIEWBOX_PADDING_REAR,
    paddingPerp = VIEWBOX_PADDING_PERP,
    spacing = 0,
    tipStyle = "square",
    transform,
    class: className,
    style,
}: Props = $props();
const paths: ChevronPath[] = $derived(chevronsToPaths(chevrons, spacing, tipStyle));
const viewBox = $derived(
    chevronsViewBox({
        chevrons,
        spacing,
        paddingTip,
        paddingRear,
        paddingPerp,
        tipStyle,
    }),
);
</script>

{#if root}
    <svg {viewBox} class={className} {style}>
        {#each paths as p, i (i)}
            <path d={p.d} fill={p.fill} />
        {/each}
    </svg>
{:else}
    <g {transform} class={className} {style}>
        {#each paths as p, i (i)}
            <path d={p.d} fill={p.fill} />
        {/each}
    </g>
{/if}
