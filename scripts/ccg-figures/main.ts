import { mount } from "svelte";
import FigureSheet from "./FigureSheet.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("missing #app");

mount(FigureSheet, { target });
