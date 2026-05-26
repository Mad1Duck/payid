export const SUPPORTED_CHAIN_IDS = [16600, 16601, 16602, 421614];

export const EXPLORER_URLS: Record<number, string> = {
  16600: 'https://chainscan-newton.0g.ai',
  16601: 'https://chainscan-newton.0g.ai',
  16602: 'https://chainscan-galileo.0g.ai',
  421614: 'https://sepolia.arbiscan.io',
};

export const AI_BASE =
  import.meta.env.VITE_0G_AI_BASE_URL ??
  'https://compute-network-6.integratenetwork.work/v1/proxy';
export const AI_KEY = import.meta.env.VITE_0G_AI_API_KEY ?? '';
export const AI_MODEL =
  import.meta.env.VITE_0G_AI_MODEL ?? 'qwen/qwen-2.5-7b-instruct';
