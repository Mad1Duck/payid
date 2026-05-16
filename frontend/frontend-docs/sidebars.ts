import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'quickstart',
    'simple-usage',
    'advanced-usage',

    {
      type: 'category',
      label: '🚀 Getting Started',
      collapsed: false,
      items: ['installation/setup'],
    },

    {
      type: 'category',
      label: '📚 Core Concepts',
      collapsed: false,
      items: ['core-concepts/overview'],
    },

    {
      type: 'category',
      label: '📋 Rules',
      collapsed: false,
      items: [
        'rules/rule-basics',
        'rules/combining-rules',
      ],
    },

    {
      type: 'category',
      label: '⚛️ React Integration',
      collapsed: false,
      items: [
        'integration/react-integration',
        'integration/ai-agents',
      ],
    },

    {
      type: 'category',
      label: '💻 Code Examples',
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
      label: '🌐 Real-World',
      collapsed: true,
      items: [
        'integration/tokochain-simulation',
        'integration/bank-qris-bridge',
      ],
    },

    {
      type: 'category',
      label: '�️ VRAN',
      collapsed: true,
      items: [
        'integration/vran-reputation',
      ],
    },

    {
      type: 'category',
      label: '�📖 Reference',
      collapsed: true,
      items: [
        'api/sdk-reference',
        'network/contracts-address',
        'contracts/contracts',
      ],
    },

    'changelog',
  ],
};

export default sidebars;