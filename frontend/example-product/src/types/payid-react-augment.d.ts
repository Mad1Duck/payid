export { };

declare global {
  interface Window {
    /** EIP-1193 injected provider (MetaMask, Rabby, etc.) */
    ethereum?: {
      request: (args: { method: string; params?: unknown[]; }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
      [key: string]: unknown;
    };
  }
}
