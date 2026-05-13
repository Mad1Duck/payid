import { useCallback, useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import type { Hash, WriteContractParameters } from 'viem'

type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'error'

interface TxState {
  send: (args: WriteContractParameters) => Promise<void>
  hash: Hash | null
  status: TxStatus
  error: string | null
  reset: () => void
  isPending: boolean
}

export function useTx(): TxState {
  const { writeContractAsync } = useWriteContract()
  const [hash, setHash] = useState<Hash | null>(null)
  const [status, setStatus] = useState<TxStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const { isSuccess: confirmed } = useWaitForTransactionReceipt({
    hash: hash ?? undefined,
  })

  useEffect(() => {
    if (confirmed && status === 'confirming') setStatus('success')
  }, [confirmed, status])

  const send = useCallback(
    async (args: WriteContractParameters) => {
      setStatus('pending')
      setError(null)
      setHash(null)
      try {
        const h = await writeContractAsync(args)
        setHash(h)
        setStatus('confirming')
      } catch (e: unknown) {
        const err = e as { shortMessage?: string; message?: string }
        const msg = err.shortMessage ?? err.message ?? String(e)
        setError(
          msg.toLowerCase().includes('user rejected')
            ? 'Transaction rejected'
            : msg,
        )
        setStatus('error')
      }
    },
    [writeContractAsync],
  )

  const reset = useCallback(() => {
    setHash(null)
    setStatus('idle')
    setError(null)
  }, [])

  return {
    send,
    hash,
    status,
    error,
    reset,
    isPending: status === 'pending' || status === 'confirming',
  }
}
