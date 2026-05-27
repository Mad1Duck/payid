// Auto-generated from PayIDVerifier.sol
export const PayIDVerifierAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AccessControlBadConfirmation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "neededRole",
        "type": "bytes32"
      }
    ],
    "name": "AccessControlUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ECDSAInvalidSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "length",
        "type": "uint256"
      }
    ],
    "name": "ECDSAInvalidSignatureLength",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
      }
    ],
    "name": "ECDSAInvalidSignatureS",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShortString",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitialized",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "str",
        "type": "string"
      }
    ],
    "name": "StringTooLong",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "authority",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "trusted",
        "type": "bool"
      }
    ],
    "name": "AuthorityUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "previousAdminRole",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newAdminRole",
        "type": "bytes32"
      }
    ],
    "name": "RoleAdminChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleRevoked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DECISION_TYPEHASH",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "DEFAULT_ADMIN_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SIGNATURE_VERSION",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "SIGNING_DOMAIN",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "attestationVerifier",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "domainSeparator",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "fields",
        "type": "bytes1"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifyingContract",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "extensions",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      }
    ],
    "name": "getRoleAdmin",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "grantRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
        "internalType": "struct PayIDVerifier.Decision",
        "name": "d",
        "type": "tuple"
      }
    ],
    "name": "hashDecision",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_attestationVerifier",
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
    "name": "isInitialized",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "callerConfirmation",
        "type": "address"
      }
    ],
    "name": "renounceRole",
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
        "internalType": "struct PayIDVerifier.Decision",
        "name": "d",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "sig",
        "type": "bytes"
      }
    ],
    "name": "requireAllowed",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "authorities",
        "type": "address[]"
      },
      {
        "internalType": "bool[]",
        "name": "trusted",
        "type": "bool[]"
      }
    ],
    "name": "setTrustedAuthorities",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "authority",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "trusted",
        "type": "bool"
      }
    ],
    "name": "setTrustedAuthority",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "trustedAuthorities",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "usedNonce",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
        "internalType": "struct PayIDVerifier.Decision",
        "name": "d",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "sig",
        "type": "bytes"
      }
    ],
    "name": "verifyDecision",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;
