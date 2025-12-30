import { createSessionPolicyPayload } from "payid/sessionPolicy";
import { ethers } from "ethers";
import { envData } from "../../config/config";

const { rpcUrl: RPC_URL, account: { senderPk: SENDER_PRIVATE_KEY, receiverPk: RECIVER_PRIVATE_KEY } } = envData;

const merchantAddress = "0x73F98364f6B62a5683F2C14ae86a23D7288f6106";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const walletReciver = new ethers.Wallet(
  RECIVER_PRIVATE_KEY,
  provider
);

export const qrPayloadData = async () => await createSessionPolicyPayload({
  receiver: merchantAddress,
  rule: {
    version: "1",
    logic: "AND",
    rules: [
      {
        id: "exact_amount",
        if: {
          field: "tx.amount",
          op: "==",
          value: "150000000"
        }
      }
    ]
  },
  expiresAt: Math.floor(Date.now() / 1000) + 120,
  signer: walletReciver
});
