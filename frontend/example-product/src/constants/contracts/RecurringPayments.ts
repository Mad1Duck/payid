// Auto-generated from RecurringPayments.sol
export const RecurringPaymentsAbi = [
  {
    "inputs": [],
    "name": "ExceedsMax",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotActive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPayer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotReceiver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooSoon",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "subId",
        "type": "uint256"
      }
    ],
    "name": "Cancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "subId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "Charged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "subId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "maxAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      }
    ],
    "name": "SubscriptionCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "subId",
        "type": "uint256"
      }
    ],
    "name": "cancel",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "subId",
        "type": "uint256"
      },
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
        "internalType": "struct PayIDVerifier.Decision",
        "name": "decision",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "sig",
        "type": "bytes"
      },
      {
        "internalType": "bytes32[]",
        "name": "attestationUIDs",
        "type": "bytes32[]"
      }
    ],
    "name": "charge",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
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
        "name": "maxAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      }
    ],
    "name": "createSubscription",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "subId",
        "type": "uint256"
      }
    ],
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
    "name": "nextSubId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
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
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "subscriptions",
    "outputs": [
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
        "name": "maxAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "period",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "nextCharge",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalCharged",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "numCharges",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
