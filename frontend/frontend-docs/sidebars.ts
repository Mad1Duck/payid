import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'quickstart',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['installation/setup'],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: false,
      items: ['core-concepts/overview'],
    },
    {
      type: 'category',
      label: 'Rules',
      collapsed: false,
      items: [
        'rules/rule-basics',
        'rules/combining-rules',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      items: [
        'examples/client',
        'examples/server',
        'examples/create-nft-rule',
        'examples/register-combined-rule',
      ],
    },
    {
      type: 'category',
      label: 'Integration',
      collapsed: true,
      items: [
        'integration/react-integration',
        'integration/tokochain-simulation',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        'api/sdk-reference',
        'network/contracts-address',
        'contracts/contracts',
      ],
    },
  ],
};

export default sidebars;