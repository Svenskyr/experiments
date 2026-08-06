export interface SliderQuestionProps {
    qid: string;
    questionText: string;
    range: [number, number];
    step?: number;
    initialValue?: number;
    tickInterval?: number;
    rangeLabels?: string[];
    showValueLabel?: boolean;
    required?: boolean;
    onComplete?: () => void;
    exportResponse?: (qid: string, value: number | null) => void;
    inputValue?: number | null;
}

export function getTicks(range: [number, number], tickInterval: number) {
    const ticks: number[] = [];
    for (let i = range[0]; i <= range[1]; i += tickInterval) {
        ticks.push(i);
    }

    return ticks;
}
