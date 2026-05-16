export interface Agent {
  owner: string
  handle: string
  name: string
  metadataURI: string
  modelType: string
  computeProvider: string
  computeEndpoint: string
  registeredAt: bigint
  active: boolean
  verified: boolean
  reputationScore: bigint
  totalInferences: bigint
  lastActiveAt: bigint
}
