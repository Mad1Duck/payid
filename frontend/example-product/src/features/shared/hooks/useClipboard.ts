import { useState, useCallback, useEffect } from 'react';

export function useClipboard(timeout = 2000) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      setCopied(true);
    },
    [],
  );

  const reset = useCallback(() => {
    setCopied(false);
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), timeout);
    return () => clearTimeout(id);
  }, [copied, timeout]);

  return { copied, copy, reset };
}
