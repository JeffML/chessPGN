import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'chessPGN',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://JeffML.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/chessPGN/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'JeffML', // Usually your GitHub org/user name.
  projectName: 'chessPGN', // Usually your repo name.

  trailingSlash: true,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: false,
          lastVersion: 'v1.4.0',
          versions: {
            current: {
              banner: 'unreleased',
            },
            'v1.4.0': {
              banner: 'none',
            },
          },
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'chessPGN',
      items: [
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/JeffML/chessPGN',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    tableOfContents: {
      minHeadingLevel: 2,
      maxHeadingLevel: 6,
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Project',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/JeffML/chessPGN',
            },
            {
              label: 'NPM',
              href: 'https://www.npmjs.com/package/chessPGN',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Jeff Hlywa. Refactored by Jeff Lowery on October ${new Date().getFullYear()} for readability and maintainability`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
