<script lang="ts">
import {
    possibleGameActions,
    possibleGameOutcomes,
} from "$exp/ccg-01/_components/ColorCoordinationGame/GameConfig.ts";
import ColorCoordinationGame from "$lib/exp/games/ccg/v3/game/ColorCoordinationGame.svelte";
import {
    type GameSession,
    type GameSessionConfig,
    newGameSession,
    shuffledAvatars,
} from "$lib/exp/games/ccg/v3/game/gameState.ts";

type Variant = "full" | "choices";

function figureConfig(variant: Variant): GameSessionConfig {
    return {
        possibleAvatars: shuffledAvatars,
        possibleActions: possibleGameActions,
        possibleOutcomes: possibleGameOutcomes,
        maxRounds: Infinity,
        useSubmitButton: false,
        showPlayerLabels: true,
        showPredictionMismatchWarning: false,
        showPredictionControls: variant === "full",
        showPayoffTable: variant === "full",
    };
}

interface Figure {
    variant: Variant;
    id: string;
    session: GameSession;
}

const figures: Figure[] = [];

for (const variant of ["full", "choices"] as const) {
    const config = figureConfig(variant);
    for (const player of shuffledAvatars) {
        for (const opponent of shuffledAvatars) {
            for (const choice1 of possibleGameActions) {
                for (const choice2 of possibleGameActions) {
                    if (choice1 === choice2) continue;
                    figures.push({
                        variant,
                        id: `${player.name}-${opponent.name}_${choice1.key}-${choice2.key}`,
                        session: newGameSession(config, {
                            selectedAvatar: player,
                            permutationTracker: {
                                permutations: [{
                                    avatars: [player, opponent],
                                    actions: [choice1, choice2],
                                    outcomes: possibleGameOutcomes,
                                }],
                                roundsPlayed: 0,
                            },
                        }),
                    });
                }
            }
        }
    }
}
</script>

<div class="sheet">
    {#each figures as figure (figure.variant + figure.id)}
        <div class="figure" data-variant={figure.variant} data-figure-id={figure.id}>
            <ColorCoordinationGame session={figure.session} />
        </div>
    {/each}
</div>

<style>
:global(html) {
    color-scheme: light;
    background: transparent;
    font-family: system-ui;
}

:global(body) {
    margin: 0;
    background: transparent;
    color: black;
}

:global(.hint-box) {
    display: none;
}

:global(.prediction-unmade) {
    opacity: 1;
}

/* The study clips avatars with border-radius. That fringe reads as a faint box on export. */
:global(img.player-avatar) {
    border-radius: 0 !important;
    box-shadow: none !important;
}

.sheet {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
    background: transparent;
}

.figure {
    background: transparent;
}
</style>
