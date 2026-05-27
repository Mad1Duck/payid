import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'intro',
        'quickstart',
        'simple-usage',
        'installation/setup',
      ],
    },

    {
      type: 'category',
      label: 'Core Concepts',
      collapsed: true,
      items: [
        'core-concepts/overview',
        'rules/rule-basics',
        'rules/combining-rules',
      ],
    },

    {
      type: 'category',
      label: 'Integration Guides',
      collapsed: true,
      items: [
        'integration/react-integration',
        'integration/platform-adapters',
      ],
    },

    {
      type: 'category',
      label: 'AI Agents',
      collapsed: true,
      items: [
        'ai-agents/ai-agents-integration',
      ],
    },

    {
      type: 'category',
      label: 'Security & Trust',
      collapsed: true,
      items: [
        'security/vran-reputation',
        'security/bank-qris-bridge',
      ],
    },

    {
      type: 'category',
      label: 'Payment Flows',
      collapsed: true,
      items: [
        'payment-flows/multi-token-pricing',
        'payment-flows/platform-payid-bridge',
      ],
    },

    {
      type: 'category',
      label: 'Testing & Simulation',
      collapsed: true,
      items: [
        'testing/tokochain-simulation',
      ],
    },

    {
      type: 'category',
      label: 'Code Examples',
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
      label: 'API Reference',
      collapsed: true,
      items: [
        'api/sdk-reference',
      ],
    },

    {
      type: 'category',
      label: 'Resources',
      collapsed: true,
      items: [
        'network/contracts-address',
        'changelog',
      ],
    },
  ],
};

export default sidebars;