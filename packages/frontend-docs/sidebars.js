// sidebars.js
// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: "doc",
      id: "intro",
      label: "🏠 Apa itu PAY.ID?",
    },
    {
      type: "doc",
      id: "quickstart",
      label: "⚡ Quick Start (15 menit)",
    },
    {
      type: "category",
      label: "🚀 Getting Started",
      collapsed: false,
      items: [
        "installation/setup",
        "network/contracts-address",
      ],
    },
    {
      type: "category",
      label: "🧠 Core Concepts",
      collapsed: false,
      items: [
        "core-concepts/overview",
      ],
    },
    {
      type: "category",
      label: "📋 Rules",
      collapsed: false,
      items: [
        "rules/rule-basics",
        "rules/combining-rules",
      ],
    },
    {
      type: "category",
      label: "🔌 Integration",
      collapsed: false,
      items: [
        "integration/react-integration",
        "integration/tokochain-simulation",
      ],
    },
    {
      type: "category",
      label: "💡 Examples",
      collapsed: false,
      items: [
        "examples/create-nft-rule",
        "examples/register-combined-rule",
        "examples/client",
        "examples/server",
      ],
    },
    {
      type: "category",
      label: "⛓️ Smart Contracts",
      collapsed: false,
      items: [
        "contracts/contracts",
      ],
    },
    {
      type: "category",
      label: "📖 API Reference",
      collapsed: false,
      items: [
        "api/sdk-reference",
      ],
    },
  ],
};

module.exports = sidebars;
