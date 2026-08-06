export type AllocationSubcomponentProp = {
    name: string;
    description?: string;
    propIndex?: number;
    displayIndex?: number;
    color?: string;
};

export type AllocationSubcomponent = Omit<AllocationSubcomponentProp, "propIndex" | "color"> & {
    name: string;
    description?: string;
    propIndex: number;
    displayIndex: number;
    color: string;
    value: number;
    max: number;
    marginRight: number;
    marginLeft: number;
    sumBehind: number;
    sumAhead: number;
    isRemainder: boolean;
};

export type AllocationQuestionProps = {
    qid: string;
    questionText: string;
    remainderLabel?: string;
    subcomponents: AllocationSubcomponentProp[];
    randomize: boolean;
};

// export type AllocationQuestion = Omit<AllocationQuestionProps, "subcomponents"> & {
//     subcomponents: AllocationSubcomponent[];
// }

export class AllocationQuestion {
    readonly qid: string;
    readonly questionText: string;
    readonly remainderLabel?: string;

    subcomponents: AllocationSubcomponent[] = $state([]);

    constructor(public props: AllocationQuestionProps) {
        this.qid = props.qid;
        this.questionText = props.questionText;
        this.remainderLabel = props.remainderLabel;
        this.#indexSubcomponentProps(props.subcomponents, props.randomize); // Reassigns displayIndex of props in-place
        const colorSeed = Math.random() * 360;
        this.subcomponents = props.subcomponents.map((sc) =>
            createSubcomponent(sc, this, colorSeed)
        );
    }

    get sum(): number {
        return this.subcomponents.reduce((acc, sc) => acc + sc.value, 0);
    }
    sumOthers(sc: AllocationSubcomponent): number {
        return this.sum - sc.value;
    }
    sumAhead(sc: AllocationSubcomponent): number {
        return this.subcomponents.filter((s) => s.displayIndex > sc.displayIndex).reduce(
            (acc, s) => acc + s.value,
            0,
        );
    }
    sumBehind(sc: AllocationSubcomponent): number {
        return this.subcomponents.filter((s) => s.displayIndex < sc.displayIndex).reduce(
            (acc, s) => acc + s.value,
            0,
        );
    }
    resetValues() {
        for (const sc of this.subcomponents) sc.value = 0;
    }

    #indexSubcomponentProps(props: AllocationSubcomponentProp[], randomize: boolean): void {
        switch (randomize) {
            case true: {
                const maxIndex = Math.max(...props.map((prop) => prop.propIndex ?? 0));
                for (const [i, sc] of props.entries()) {
                    sc.propIndex = sc.propIndex ?? 0;
                    sc.displayIndex = sc.propIndex ?? 0;
                    if (sc.propIndex < 0) sc.displayIndex = maxIndex - (1 / sc.propIndex); // index wraparound
                }

                const counts = new Map<number, number>();
                for (const sc of props) {
                    counts.set(sc.propIndex!, (counts.get(sc.propIndex!) || 0) + 1);
                }

                for (const sc of props) {
                    if (counts.get(sc.propIndex!)! > 1) {
                        sc.displayIndex! += Math.random() * 0.01;
                    }
                }

                props.sort((a, b) => a.displayIndex! - b.displayIndex!);
                for (const [i, sc] of props.entries()) {
                    sc.displayIndex = i;
                }
                break;
            }

            case false: {
                for (const [i, sc] of props.entries()) {
                    sc.propIndex = sc.propIndex ?? i;
                    sc.displayIndex = sc.propIndex ?? i;
                }
                break;
            }
        }
        return;
    }
}

function createSubcomponent(
    prop: AllocationSubcomponentProp,
    parent: AllocationQuestion,
    colorSeed?: number,
) {
    let value = $state(0);
    const displayIndex = prop.displayIndex ?? 0;
    const color = prop.color ?? randColor(displayIndex, colorSeed);

    return {
        name: prop.name,
        description: prop.description,
        propIndex: prop.propIndex ?? 0,
        displayIndex: prop.displayIndex ?? 0,
        color,
        isRemainder: false,
        get value() {
            return value;
        },
        set value(val: number) {
            value = val;
        },
        get max() {
            return 100 - parent.sumOthers(this);
        },
        get marginLeft() {
            return parent.sumBehind(this);
        },
        get marginRight() {
            return parent.sumAhead(this);
        },
        get sumBehind() {
            return parent.sumBehind(this);
        },
        get sumAhead() {
            return parent.sumAhead(this);
        },
    } as AllocationSubcomponent;
}

function randColor(i: number, seed?: number): string {
    // Golden angle: 137.508 degrees
    const saturation = 50; // 50% saturation for vibrant colors, 100% for full saturation
    const lightness = 60; // 50% lightness for normal colors, 75% for lighter colors
    return `hsl(${(i + (seed ?? 0)) * 137.508}, ${saturation}%, ${lightness}%)`;
}
