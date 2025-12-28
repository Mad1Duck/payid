import { ethers } from "ethers";

export async function queryEventsInChunks({
  contract,
  eventName,
  fromBlock,
  toBlock,
  step = 50_000n
}: {
  contract: ethers.Contract;
  eventName: string;
  fromBlock: bigint;
  toBlock: bigint;
  step?: bigint;
}) {
  const events = [];

  for (
    let start = fromBlock;
    start <= toBlock;
    start += step
  ) {
    const end =
      start + step - 1n > toBlock
        ? toBlock
        : start + step - 1n;

    const chunk = await contract.queryFilter(
      eventName,
      start,
      end
    );

    events.push(...chunk);
  }

  return events;
}
