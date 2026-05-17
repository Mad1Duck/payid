const globalShim = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : {};
export default globalShim;
export { };