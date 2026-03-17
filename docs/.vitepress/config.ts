import { defineConfig } from "vitepress";

export default defineConfig({
    title: "Safe Access Inline",
    description:
        "Safely access deeply nested data with dot notation — one API, 10 formats, PHP + JS/TS.",

    head: [
        [
            "link",
            {
                rel: "icon",
                type: "image/svg+xml",
                href: "/safe-access-inline/logo.svg",
            },
        ],
    ],

    base: "/safe-access-inline/",
    cleanUrls: true,
    lastUpdated: true,

    locales: {
        root: {
            label: "English",
            lang: "en",
            themeConfig: {
                nav: nav(),
                sidebar: sidebar(),
            },
        },
        "pt-br": {
            label: "Português (BR)",
            lang: "pt-BR",
            themeConfig: {
                nav: navPtBr(),
                sidebar: sidebarPtBr(),
                outline: { label: "Nesta página" },
                lastUpdated: { text: "Última atualização" },
                docFooter: {
                    prev: "Anterior",
                    next: "Próximo",
                },
                returnToTopLabel: "Voltar ao topo",
                sidebarMenuLabel: "Menu",
                darkModeSwitchLabel: "Tema",
            },
        },
    },

    themeConfig: {
        logo: { light: "/logo.svg", dark: "/logo-dark.svg" },

        socialLinks: [
            {
                icon: "github",
                link: "https://github.com/felipesauer/safe-access-inline",
            },
            {
                icon: "npm",
                link: "https://www.npmjs.com/package/@safe-access-inline/safe-access-inline",
            },
        ],

        footer: {
            message: "Released under the MIT License.",
            copyright: "Copyright © 2026 Felipe Sauer",
        },

        search: {
            provider: "local",
        },

        editLink: {
            pattern:
                "https://github.com/felipesauer/safe-access-inline/edit/main/docs/:path",
            text: "Edit this page on GitHub",
        },
    },
});

/* ---------- English ---------- */

function nav() {
    return [
        { text: "Guide", link: "/guide/", activeMatch: "/guide/" },
        {
            text: "JS / TS",
            items: [
                { text: "Getting Started", link: "/js/getting-started" },
                { text: "API Reference", link: "/js/api-reference" },
                { text: "Plugins", link: "/js/plugins" },
            ],
        },
        {
            text: "PHP",
            items: [
                { text: "Getting Started", link: "/php/getting-started" },
                { text: "API Reference", link: "/php/api-reference" },
                { text: "Plugins", link: "/php/plugins" },
            ],
        },
        { text: "CLI", link: "/cli/" },
        {
            text: "Links",
            items: [
                {
                    text: "npm",
                    link: "https://www.npmjs.com/package/@safe-access-inline/safe-access-inline",
                },
                {
                    text: "Packagist",
                    link: "https://packagist.org/packages/safe-access-inline/safe-access-inline",
                },
                {
                    text: "Changelog",
                    link: "https://github.com/felipesauer/safe-access-inline/blob/main/CHANGELOG.md",
                },
            ],
        },
    ];
}

function sidebar() {
    return [
        {
            text: "Introduction",
            items: [
                { text: "What is Safe Access Inline?", link: "/guide/" },
                { text: "Architecture", link: "/guide/architecture" },
            ],
        },
        {
            text: "JavaScript / TypeScript",
            items: [
                { text: "Getting Started", link: "/js/getting-started" },
                { text: "API Reference", link: "/js/api-reference" },
                { text: "Plugins", link: "/js/plugins" },
            ],
        },
        {
            text: "PHP",
            items: [
                { text: "Getting Started", link: "/php/getting-started" },
                { text: "API Reference", link: "/php/api-reference" },
                { text: "Plugins", link: "/php/plugins" },
            ],
        },
        {
            text: "CLI",
            items: [{ text: "Getting Started", link: "/cli/" }],
        },
    ];
}

/* ---------- Portuguese (BR) ---------- */

function navPtBr() {
    return [
        { text: "Guia", link: "/pt-br/guide/", activeMatch: "/pt-br/guide/" },
        {
            text: "JS / TS",
            items: [
                {
                    text: "Primeiros Passos",
                    link: "/pt-br/js/getting-started",
                },
                {
                    text: "Referência da API",
                    link: "/pt-br/js/api-reference",
                },
                { text: "Plugins", link: "/pt-br/js/plugins" },
            ],
        },
        {
            text: "PHP",
            items: [
                {
                    text: "Primeiros Passos",
                    link: "/pt-br/php/getting-started",
                },
                {
                    text: "Referência da API",
                    link: "/pt-br/php/api-reference",
                },
                { text: "Plugins", link: "/pt-br/php/plugins" },
            ],
        },
        { text: "CLI", link: "/pt-br/cli/" },
    ];
}

function sidebarPtBr() {
    return [
        {
            text: "Introdução",
            items: [
                {
                    text: "O que é Safe Access Inline?",
                    link: "/pt-br/guide/",
                },
                { text: "Arquitetura", link: "/pt-br/guide/architecture" },
            ],
        },
        {
            text: "JavaScript / TypeScript",
            items: [
                {
                    text: "Primeiros Passos",
                    link: "/pt-br/js/getting-started",
                },
                {
                    text: "Referência da API",
                    link: "/pt-br/js/api-reference",
                },
                { text: "Plugins", link: "/pt-br/js/plugins" },
            ],
        },
        {
            text: "PHP",
            items: [
                {
                    text: "Primeiros Passos",
                    link: "/pt-br/php/getting-started",
                },
                {
                    text: "Referência da API",
                    link: "/pt-br/php/api-reference",
                },
                { text: "Plugins", link: "/pt-br/php/plugins" },
            ],
        },
        {
            text: "CLI",
            items: [{ text: "Primeiros Passos", link: "/pt-br/cli/" }],
        },
    ];
}
