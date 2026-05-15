import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface PremiumButtonProps {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  isLoading?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[#00D084] text-[#0B0F1A] hover:bg-[#00D084]/90',
  secondary: 'bg-white/6 border border-white/8 text-white hover:bg-white/10',
  ghost: 'bg-transparent text-white hover:bg-white/5',
  danger: 'bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function PremiumButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  isLoading = false,
  icon,
}: PremiumButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
      className={`
        relative overflow-hidden rounded-xl font-semibold transition-all
        disabled:opacity-30 disabled:cursor-not-allowed
        ${VARIANTS[variant]}
        ${SIZES[size]}
        ${className}
      `}
    >
      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 bg-white/10"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 2, opacity: 0.2, transition: { duration: 0.3 } }}
      />

      {/* Content */}
      <span className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
          />
        ) : (
          icon
        )}
        {children}
      </span>

      {/* Shine effect on hover */}
      <motion.div
        className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent"
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.6 }}
        style={{ pointerEvents: 'none' }}
      />
    </motion.button>
  )
}
