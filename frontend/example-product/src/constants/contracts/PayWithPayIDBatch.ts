// Auto-generated from PayWithPayIDBatch.sol
export const PayWithPayIDBatchAbi = [
  {
    "inputs": [],
    "name": "BatchEmpty",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "BatchTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitialized",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      }
    ],
    "name": "BatchPaymentERC20",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      }
    ],
    "name": "BatchPaymentETH",
    "type": "event"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "version",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "payId",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "payer",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "asset",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "contextHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "ruleSetHash",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "ruleAuthority",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "issuedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "expiresAt",
            "type": "uint64"
          },
          {
            "internalType": "bytes32",
            "name": "nonce",
            "type": "bytes32"
          },
          {
            "internalType": "bool",
            "name": "requiresAttestation",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "attestationUIDsHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct PayIDVerifier.Decision[]",
        "name": "decisions",
        "type": "tuple[]"
      },
      {
        "internalType": "bytes[]",
        "name": "sigs",
        "type": "bytes[]"
      },
      {
        "internalType": "bytes32[][]",
        "name": "attestationUIDs",
        "type": "bytes32[][]"
      }
    ],
    "name": "batchPayERC20",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "version",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "payId",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "payer",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "receiver",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "asset",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "contextHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "ruleSetHash",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "ruleAuthority",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "issuedAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "expiresAt",
            "type": "uint64"
          },
          {
            "internalType": "bytes32",
            "name": "nonce",
            "type": "bytes32"
          },
          {
            "internalType": "bool",
            "name": "requiresAttestation",
            "type": "bool"
          },
          {
            "internalType": "bytes32",
            "name": "attestationUIDsHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct PayIDVerifier.Decision[]",
        "name": "decisions",
        "type": "tuple[]"
      },
      {
        "internalType": "bytes[]",
        "name": "sigs",
        "type": "bytes[]"
      },
      {
        "internalType": "bytes32[][]",
        "name": "attestationUIDs",
        "type": "bytes32[][]"
      }
    ],
    "name": "batchPayNative",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "payWithPayID_",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "payWithPayID",
    "outputs": [
      {
        "internalType": "contract PayWithPayID",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
