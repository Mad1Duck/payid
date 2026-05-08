export interface Attestation {
  issuer: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}
