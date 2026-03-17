import DefaultTheme from "vitepress/theme";
import { h } from "vue";
import type { Theme } from "vitepress";
import MermaidEnhancer from "./MermaidEnhancer.vue";
import "./style.css";

export default {
    extends: DefaultTheme,
    Layout() {
        return h(DefaultTheme.Layout, null, {
            "layout-bottom": () => h(MermaidEnhancer),
        });
    },
} satisfies Theme;
