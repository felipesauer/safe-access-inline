<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vitepress";

const route = useRoute();
let retryTimer: ReturnType<typeof setTimeout> | null = null;

const I_ZOOM_IN  = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Zm-4.25-.75V4.75a.75.75 0 0 1 1.5 0V6.25h1.5a.75.75 0 0 1 0 1.5H8.75V9.25a.75.75 0 0 1-1.5 0V7.75h-1.5a.75.75 0 0 1 0-1.5Z"/></svg>`;
const I_ZOOM_OUT = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7ZM6 6.25h3a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5Z"/></svg>`;
const I_ZOOM_RST = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M10.68 11.74a6 6 0 0 1-7.922-8.982 6 6 0 0 1 8.982 7.922l3.04 3.04a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215ZM11.5 7a4.499 4.499 0 1 0-8.997 0A4.499 4.499 0 0 0 11.5 7Z"/></svg>`;
const I_COPY     = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>`;
const I_CHECK    = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>`;
const I_DOWNLOAD = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/><path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.779a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Z"/></svg>`;
const I_EXPAND   = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M1.75 10a.75.75 0 0 1 .75.75v2.5c0 .138.112.25.25.25h2.5a.75.75 0 0 1 0 1.5h-2.5A1.75 1.75 0 0 1 1 13.25v-2.5a.75.75 0 0 1 .75-.75ZM14.25 10a.75.75 0 0 1 .75.75v2.5A1.75 1.75 0 0 1 13.25 15h-2.5a.75.75 0 0 1 0-1.5h2.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 .75-.75ZM1.75 6a.75.75 0 0 1-.75-.75v-2.5C1 1.784 1.784 1 2.75 1h2.5a.75.75 0 0 1 0 1.5h-2.5a.25.25 0 0 0-.25.25v2.5A.75.75 0 0 1 1.75 6ZM14.25 6a.75.75 0 0 1-.75-.75v-2.5a.25.25 0 0 0-.25-.25h-2.5a.75.75 0 0 1 0-1.5h2.5C14.216 1 15 1.784 15 2.75v2.5a.75.75 0 0 1-.75.75Z"/></svg>`;
const I_CLOSE    = `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"/></svg>`;

const STEP = 0.25;  // 25% zoom step
const MIN  = 0.25;  // minimum 25%
const MAX  = 3.0;   // maximum 300%

interface ZoomState { scale: number; w: number; h: number }
const zoomMap = new WeakMap<HTMLElement, ZoomState>();

function btn(title: string, icon: string, extra = ""): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mermaid-action-btn" + (extra ? " " + extra : "");
    b.title = title;
    b.setAttribute("aria-label", title);
    b.innerHTML = icon;
    return b;
}

function pctLabel(): HTMLOutputElement {
    const el = document.createElement("output");
    el.className = "mermaid-zoom-pct";
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", "Zoom: 100%");
    el.textContent = "100%";
    return el;
}

function sep(): HTMLSpanElement {
    const s = document.createElement("span");
    s.className = "mermaid-toolbar-sep";
    s.setAttribute("aria-hidden", "true");
    return s;
}

function group(...els: HTMLElement[]): HTMLDivElement {
    const g = document.createElement("div");
    g.className = "mermaid-btn-group";
    els.forEach((el) => g.appendChild(el));
    return g;
}

function centerViewport(vp: HTMLElement) {
    // Re-center scroll so the diagram is always symmetrically visible.
    // margin: auto alone clips the left side when overflowing in a scroll container.
    requestAnimationFrame(() => {
        vp.scrollLeft = Math.max(0, (vp.scrollWidth - vp.clientWidth) / 2);
    });
}

function setZoom(
    svg: SVGSVGElement,
    state: ZoomState,
    newScale: number,
    zIn: HTMLButtonElement,
    zOut: HTMLButtonElement,
    label: HTMLOutputElement,
    viewport?: HTMLElement,
) {
    state.scale = Math.min(MAX, Math.max(MIN, +newScale.toFixed(2)));
    svg.style.width    = `${state.w * state.scale}px`;
    svg.style.height   = `${state.h * state.scale}px`;
    svg.style.maxWidth = "none";
    zIn.disabled  = state.scale >= MAX;
    zOut.disabled = state.scale <= MIN;
    const pct = Math.round(state.scale * 100);
    label.textContent = `${pct}%`;
    label.setAttribute("aria-label", `Zoom: ${pct}%`);
    if (viewport) centerViewport(viewport);
}

function applyCopy(copyBtn: HTMLButtonElement, svgEl: SVGSVGElement) {
    navigator.clipboard.writeText(svgEl.outerHTML).then(() => {
        copyBtn.innerHTML = I_CHECK;
        copyBtn.classList.add("success");
        setTimeout(() => {
            copyBtn.innerHTML = I_COPY;
            copyBtn.classList.remove("success");
        }, 2000);
    }).catch(() => { /* clipboard unavailable */ });
}

function applyDownload(svgEl: SVGSVGElement) {
    const blob = new Blob([svgEl.outerHTML], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), {
        href: url, download: "diagram.svg",
    });
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function enhance(attempt = 0) {
    if (retryTimer) clearTimeout(retryTimer);
    const pending: HTMLElement[] = [];

    document
        .querySelectorAll<HTMLElement>(".mermaid:not([data-mermaid-enhanced])")
        .forEach((host) => {
            if (host.querySelector("svg")) addControls(host);
            else pending.push(host);
        });

    if (pending.length > 0 && attempt < 15)
        retryTimer = setTimeout(() => enhance(attempt + 1), 250);
}

function addControls(host: HTMLElement) {
    host.dataset.mermaidEnhanced = "1";

    const svg = host.querySelector<SVGSVGElement>("svg")!;
    const bb  = svg.getBoundingClientRect();
    const state: ZoomState = {
        scale: 1,
        w: Math.round(bb.width)  || 800,
        h: Math.round(bb.height) || 400,
    };
    zoomMap.set(host, state);

    svg.style.width    = `${state.w}px`;
    svg.style.height   = `${state.h}px`;
    svg.style.maxWidth = "none";

    const container = document.createElement("div");
    container.className = "mermaid-container";
    host.parentNode!.insertBefore(container, host);

    const toolbar = document.createElement("div");
    toolbar.className = "mermaid-toolbar";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Diagram controls");

    const zOut = btn("Zoom out (25% step)", I_ZOOM_OUT);
    const lbl  = pctLabel();
    const zIn  = btn("Zoom in (25% step)",  I_ZOOM_IN);
    const zRst = btn("Reset zoom to 100%",  I_ZOOM_RST);
    const copy = btn("Copy SVG to clipboard", I_COPY);
    const dl   = btn("Download SVG file",     I_DOWNLOAD);
    const expd = btn("Open fullscreen",       I_EXPAND);

    // correct initial state: scale=1 is between MIN=0.25 and MAX=3.0
    zOut.disabled = false;
    zIn.disabled  = false;

    zOut.addEventListener("click", () => setZoom(svg, state, state.scale - STEP, zIn, zOut, lbl, viewport));
    zIn.addEventListener( "click", () => setZoom(svg, state, state.scale + STEP, zIn, zOut, lbl, viewport));
    zRst.addEventListener("click", () => setZoom(svg, state, 1,                  zIn, zOut, lbl, viewport));
    copy.addEventListener("click", () => applyCopy(copy, svg));
    dl.addEventListener(  "click", () => applyDownload(svg));
    expd.addEventListener("click", () => openModal(host));

    // layout: [−][100%][+][⟳] | [📋][⬇] | [⛶]
    toolbar.append(group(zOut, lbl, zIn, zRst), sep(), group(copy, dl), sep(), expd);
    container.appendChild(toolbar);

    // const is declared here; closures above capture the binding correctly
    // because they only execute on click (after this function has returned).
    const viewport = document.createElement("div");
    viewport.className = "mermaid-viewport";
    viewport.appendChild(host);
    container.appendChild(viewport);
}

function openModal(host: HTMLElement) {
    const origSvg = host.querySelector<SVGSVGElement>("svg");
    if (!origSvg) return;

    const orig   = zoomMap.get(host) ?? { scale: 1, w: 800, h: 400 };
    const mState: ZoomState = { scale: 1, w: orig.w, h: orig.h };

    const svgClone = origSvg.cloneNode(true) as SVGSVGElement;
    svgClone.style.width    = `${mState.w}px`;
    svgClone.style.height   = `${mState.h}px`;
    svgClone.style.maxWidth = "none";

    const dialog = document.createElement("dialog");
    dialog.className = "mermaid-dialog";

    const mToolbar = document.createElement("div");
    mToolbar.className = "mermaid-toolbar mermaid-dialog-toolbar";
    mToolbar.setAttribute("role", "toolbar");
    mToolbar.setAttribute("aria-label", "Diagram controls");

    const mZOut  = btn("Zoom out (25% step)",  I_ZOOM_OUT);
    const mLbl   = pctLabel();
    const mZIn   = btn("Zoom in (25% step)",   I_ZOOM_IN);
    const mZRst  = btn("Reset zoom to 100%",   I_ZOOM_RST);
    const mCopy  = btn("Copy SVG to clipboard", I_COPY);
    const mDl    = btn("Download SVG file",      I_DOWNLOAD);
    const mClose = btn("Close dialog",           I_CLOSE, "mermaid-close-btn");

    mZOut.disabled = false;
    mZIn.disabled  = false;

    function mSetZoom(newScale: number) {
        mState.scale = Math.min(MAX, Math.max(MIN, +newScale.toFixed(2)));
        svgClone.style.width  = `${mState.w * mState.scale}px`;
        svgClone.style.height = `${mState.h * mState.scale}px`;
        mZIn.disabled  = mState.scale >= MAX;
        mZOut.disabled = mState.scale <= MIN;
        const pct = Math.round(mState.scale * 100);
        mLbl.textContent = `${pct}%`;
        mLbl.setAttribute("aria-label", `Zoom: ${pct}%`);
        // Re-center the scroll position so the diagram stays centred after resize
        requestAnimationFrame(() => {
            body.scrollLeft = Math.max(0, (body.scrollWidth  - body.clientWidth)  / 2);
            body.scrollTop  = Math.max(0, (body.scrollHeight - body.clientHeight) / 2);
        });
    }

    mZOut.addEventListener( "click", () => mSetZoom(mState.scale - STEP));
    mZIn.addEventListener(  "click", () => mSetZoom(mState.scale + STEP));
    mZRst.addEventListener( "click", () => mSetZoom(1));
    mCopy.addEventListener( "click", () => applyCopy(mCopy, origSvg));
    mDl.addEventListener(   "click", () => applyDownload(origSvg));
    mClose.addEventListener("click", () => dialog.close());

    // layout mirrors inline: [−][100%][+][⟳] | [📋][⬇] | [✕]
    mToolbar.append(group(mZOut, mLbl, mZIn, mZRst), sep(), group(mCopy, mDl), sep(), mClose);

    const body = document.createElement("div");
    body.className = "mermaid-dialog-body";
    body.appendChild(svgClone);

    dialog.appendChild(mToolbar);
    dialog.appendChild(body);

    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => dialog.remove(), { once: true });

    document.body.appendChild(dialog);
    dialog.showModal();
}

onMounted(()   => { retryTimer = setTimeout(() => enhance(), 150); });
watch(() => route.path, () => {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => enhance(), 250);
});
onUnmounted(() => { if (retryTimer) clearTimeout(retryTimer); });
</script>

<template>
    <div style="display: none" aria-hidden="true" />
</template>
