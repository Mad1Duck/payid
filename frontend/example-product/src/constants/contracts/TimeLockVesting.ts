// Auto-generated from TimeLockVesting.sol
export const TimeLockVestingAbi = [
  {
    "inputs": [],
    "name": "AlreadyRevoked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CliffNotReached",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDuration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotBeneficiary",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotRevoker",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NothingToRelease",
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
        "name": "scheduleId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Released",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "scheduleId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "remaining",
        "type": "uint256"
      }
    ],
    "name": "Revoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "scheduleId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "beneficiary",
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
        "name": "totalAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "cliff",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      }
    ],
    "name": "ScheduleCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cliff",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "revocable",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "revoker",
        "type": "address"
      }
    ],
    "name": "createSchedule",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "scheduleId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextScheduleId",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "scheduleId",
        "type": "uint256"
      }
    ],
    "name": "releasable",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "scheduleId",
        "type": "uint256"
      }
    ],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "scheduleId",
        "type": "uint256"
      }
    ],
    "name": "revoke",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "schedules",
    "outputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "asset",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cliff",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "released",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "revocable",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "revoked",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "revoker",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;
