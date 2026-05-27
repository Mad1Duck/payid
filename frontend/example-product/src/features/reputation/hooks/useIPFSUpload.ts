import { useState } from 'react';

interface UseIPFSUploadResult {
  uploadToIPFS: (file: File) => Promise<string>;
  isUploading: boolean;
  error: string | null;
  progress: number;
}

function getPinataJWT(): string {
  return (import.meta.env.VITE_PINATA_JWT as string | undefined) ?? '';
}

export function useIPFSUpload(): UseIPFSUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const uploadToIPFS = async (file: File): Promise<string> => {
    setIsUploading(true);
    setError(null);
    setProgress(25);

    try {
      const jwt = getPinataJWT();
      if (!jwt) {
        throw new Error(
          'VITE_PINATA_JWT not configured. Add it to your .env file to enable IPFS uploads.'
        );
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('network', 'public');

      setProgress(50);

      const response = await fetch('https://uploads.pinata.cloud/v3/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
      });

      setProgress(75);

      if (!response.ok) {
        const text = await response.text().catch(() => 'unknown');
        throw new Error(`Pinata upload failed: ${response.status} ${text}`);
      }

      const json = (await response.json()) as { data: { cid: string; }; };
      const cid = json.data.cid;

      setProgress(100);
      return cid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadToIPFS,
    isUploading,
    error,
    progress,
  };
}
