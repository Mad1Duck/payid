import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'PAY.ID',
  tagline: 'Programmable Payment Policy. Verified Before Execution.',
  favicon: 'img/payid-logo.ico',
  plugins: ["./src/plugins/tailwind-config.js"],
  future: {
    v4: true,
  },

  url: 'https://docs.pay.id',
  baseUrl: '/',

  organizationName: 'payid',
  projectName: 'payid',

  onBrokenLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'id'],
    localeConfigs: {
      en: {
        label: '🇬🇧 English',
        direction: 'ltr',
        htmlLang: 'en',
      },
      id: {
        label: '🇮🇩 Indonesia',
        direction: 'ltr',
        htmlLang: 'id',
      },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/payid-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'PAY.ID',
      logo: {
        alt: 'PAY.ID Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/quickstart',
          label: ' Quick Start',
          position: 'left',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/your-org/payid',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Introduction', to: '/docs/intro' },
            { label: 'Quick Start', to: '/docs/quickstart' },
            { label: 'Core Concepts', to: '/docs/core-concepts/overview' },
          ],
        },
        {
          title: 'Examples',
          items: [
            { label: 'Client Flow', to: '/docs/examples/client' },
            { label: 'Server Flow', to: '/docs/examples/server' },
            { label: 'React Integration', to: '/docs/integration/react-integration' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'SDK Reference', to: '/docs/api/sdk-reference' },
            { label: 'Contract Addresses', to: '/docs/network/contracts-address' },
            { label: 'Smart Contracts', to: '/docs/contracts/contracts' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} PAY.ID. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
