declare module "debug";

declare module "*.svg?raw" {
    const content: string;
    export default content;
}
