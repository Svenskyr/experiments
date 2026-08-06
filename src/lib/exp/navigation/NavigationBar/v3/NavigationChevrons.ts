import type { ChevronExportSpec } from "$lib/common/Shapes/Chevrons/v2/chevrons.ts";
import { exportIfMain } from "$lib/common/Shapes/Chevrons/v2/exportChevrons.ts";

const chevronInnerAngle = 110;
const chevronLength = 2.5;
const chevronWidth = 1;
const chevronColor = "black";

const chevron = {
    innerAngle: chevronInnerAngle,
    length: chevronLength,
    width: chevronWidth,
    color: chevronColor,
};

const padding = {
    paddingTip: 0.75,
    paddingRear: 1,
    paddingPerp: 1,
    tipStyle: "sharp" as const,
};

export const navigationChevrons: ChevronExportSpec = {
    previous: {
        chevrons: [{ ...chevron, orientation: -90 }],
        ...padding,
    },
    next: {
        chevrons: [{ ...chevron, orientation: 90 }],
        ...padding,
    },
    max: {
        chevrons: [
            { ...chevron, orientation: 90 },
            { ...chevron, orientation: 90 },
            { ...chevron, orientation: 90 },
        ],
        spacing: -1.5,
        ...padding,
    },
};

export default navigationChevrons;

await exportIfMain(import.meta.url, navigationChevrons);
