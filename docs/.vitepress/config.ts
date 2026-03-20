import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

export default withMermaid(defineConfig({
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

    sitemap: {
        hostname: "https://felipesauer.github.io/safe-access-inline",
    },

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

    mermaid: {
        securityLevel: "loose",
        startOnLoad: false,
        flowchart: {
            htmlLabels: true,
        },
    },
}));

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
                { text: "Overview", link: "/js/" },
                { text: "Getting Started", link: "/js/getting-started" },
                { text: "Querying & Filtering", link: "/js/querying" },
                { text: "Formats & TypeScript", link: "/js/formats" },
                { text: "Plugin System", link: "/js/plugins" },
                { text: "Advanced Features", link: "/js/advanced" },
                { text: "Security & Integrations", link: "/js/security" },
                { text: "API Reference", link: "/js/api-reference" },
                { text: "API — Operations & I/O", link: "/js/api-features" },
                { text: "API — Types & Internals", link: "/js/api-types" },
            ],
        },
        {
            text: "PHP",
            items: [
                { text: "Overview", link: "/php/" },
                { text: "Getting Started", link: "/php/getting-started" },
                { text: "Querying & Filtering", link: "/php/querying" },
                { text: "Formats & Utilities", link: "/php/formats" },
                { text: "Plugin System", link: "/php/plugins" },
                { text: "Advanced Features", link: "/php/advanced" },
                { text: "Security & Integrations", link: "/php/security" },
                { text: "API Reference", link: "/php/api-reference" },
                { text: "API — Operations & I/O", link: "/php/api-features" },
                { text: "API — Types & Internals", link: "/php/api-types" },
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
                { text: "Visão Geral", link: "/pt-br/js/" },
                { text: "Primeiros Passos", link: "/pt-br/js/getting-started" },
                { text: "Consultas e Filtros", link: "/pt-br/js/querying" },
                { text: "Formatos & TypeScript", link: "/pt-br/js/formats" },
                { text: "Sistema de Plugins", link: "/pt-br/js/plugins" },
                { text: "Recursos Avançados", link: "/pt-br/js/advanced" },
                { text: "Segurança & Integrações", link: "/pt-br/js/security" },
                { text: "Referência da API", link: "/pt-br/js/api-reference" },
                { text: "API — Operações & I/O", link: "/pt-br/js/api-features" },
                { text: "API — Tipos & Internos", link: "/pt-br/js/api-types" },
            ],
        },
        {
            text: "PHP",
            items: [
                { text: "Visão Geral", link: "/pt-br/php/" },
                { text: "Primeiros Passos", link: "/pt-br/php/getting-started" },
                { text: "Consultas e Filtros", link: "/pt-br/php/querying" },
                { text: "Formatos & Utilitários", link: "/pt-br/php/formats" },
                { text: "Sistema de Plugins", link: "/pt-br/php/plugins" },
                { text: "Recursos Avançados", link: "/pt-br/php/advanced" },
                { text: "Segurança & Integrações", link: "/pt-br/php/security" },
                { text: "Referência da API", link: "/pt-br/php/api-reference" },
                { text: "API — Operações & I/O", link: "/pt-br/php/api-features" },
                { text: "API — Tipos & Internos", link: "/pt-br/php/api-types" },
            ],
        },
        {
            text: "CLI",
            items: [{ text: "Primeiros Passos", link: "/pt-br/cli/" }],
        },
    ];
}
