import { motion } from 'framer-motion'
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  QrCode,
  FileCheck,
  Globe,
  Lock,
  ChevronRight,
  Wallet,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useV4Palette } from './theme'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: 'easeOut' as const },
})

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08 } },
}

const cardHover = {
  whileHover: { y: -4, transition: { duration: 0.2 } },
}

export default function LandingPageV4() {
  const p = useV4Palette()

  return (
    <div
      className={`min-h-screen ${p.rootBg} ${p.rootText} relative overflow-hidden`}
    >
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, #00D084 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-[0.05]"
          style={{
            background: 'radial-gradient(circle, #00D084 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Noise overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          zIndex: 1,
        }}
      />

      {/* Navbar */}
      <header className="relative z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00D084]/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-sm bg-[#00D084]" />
            </div>
            <span className="text-[17px] font-bold tracking-tight">PAY.ID</span>
          </div>
          <Link to="/v4/app/dashboard">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors cursor-pointer">
              Launch App <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-16 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div {...fadeUp(0)}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00D084]/8 border border-[#00D084]/20 text-[11px] font-medium text-[#00D084] mb-6">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D084] opacity-40" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00D084]" />
              </span>
              Policy & Proof Layer for EVM Chains
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.08)}
            className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            Pay Smart. <span className="text-[#00D084]">Stay Safe.</span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.16)}
            className={`text-lg md:text-xl ${p.textMuted} max-w-2xl mx-auto mb-10 leading-relaxed`}
          >
            Policy-powered payments on EVM. Set rules. Generate proofs. Pay with
            confidence — your wallet stays in control.
          </motion.p>

          <motion.div
            {...fadeUp(0.24)}
            className="flex items-center justify-center gap-4"
          >
            <Link to="/v4/app/dashboard">
              <button className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors shadow-lg shadow-[#00D084]/10 cursor-pointer">
                Launch App <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <a
              href="#how-it-works"
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border ${p.cardBorder} text-sm font-medium ${p.cardHover} transition-colors`}
            >
              How it works <ChevronRight className="w-4 h-4" />
            </a>
          </motion.div>

          {/* Trusted by / Stats */}
          <motion.div
            {...fadeUp(0.32)}
            className="mt-20 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          >
            {[
              { label: 'Chains', value: '8+' },
              { label: 'Rules Engine', value: 'WASM' },
              { label: 'Proof Standard', value: 'EIP-712' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold font-mono text-[#00D084]">
                  {stat.value}
                </div>
                <div
                  className={`text-[11px] ${p.textMuted} mt-1 uppercase tracking-wider`}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${p.textMain}`}>
              Everything you need to pay with policy.
            </h2>
            <p className={`${p.textMuted} max-w-xl mx-auto`}>
              Set your rules. We enforce them. Every payment gets evaluated
              off-chain, proven on-chain.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5"
          >
            {[
              {
                icon: Zap,
                title: 'Send (but make it smart)',
                desc: 'Every transaction runs through your policy engine. Business hours, spending limits, KYC — all enforced automatically.',
                color: '#00D084',
              },
              {
                icon: QrCode,
                title: 'Receive like a pro',
                desc: 'Share your PayID or QR. Get paid without exposing your raw wallet address. Clean, simple, professional.',
                color: '#00D084',
              },
              {
                icon: ShieldCheck,
                title: 'Rules that think',
                desc: 'WASM-based rule engine. Deterministic, fast, and tamper-proof. Your policy, your control.',
                color: '#00D084',
              },
              {
                icon: FileCheck,
                title: 'Proof on-chain',
                desc: 'EIP-712 Decision Proofs verify every payment. Cryptographic proof that your rules were followed.',
                color: '#00D084',
              },
              {
                icon: Lock,
                title: 'Keys stay with you',
                desc: 'Self-custody by design. We never touch your private keys. Your rules, your wallet, your proof.',
                color: '#00D084',
              },
              {
                icon: Globe,
                title: 'Multichain magic',
                desc: 'Built for EVM. Hardhat, Sepolia, Base, Polygon, and more. Same rules, any chain.',
                color: '#00D084',
              },
            ].map((feat) => (
              <motion.div
                key={feat.title}
                variants={fadeUp()}
                {...cardHover}
                className="rounded-2xl p-6 relative overflow-hidden group cursor-default"
                style={{
                  background: p.dark
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(0,0,0,0.02)',
                }}
              >
                <div
                  className={`absolute inset-0 rounded-2xl border ${p.cardBorder} group-hover:${p.dark ? 'border-white/10' : 'border-black/10'} transition-colors`}
                />
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `${feat.color}15` }}
                  >
                    <feat.icon
                      className="w-5 h-5"
                      style={{ color: feat.color }}
                    />
                  </div>
                  <h3
                    className={`text-[15px] font-semibold mb-2 ${p.textMain}`}
                  >
                    {feat.title}
                  </h3>
                  <p className={`text-[13px] ${p.textMuted} leading-relaxed`}>
                    {feat.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeUp(0)} className="text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${p.textMain}`}>
              How it works
            </h2>
            <p className={`${p.textMuted} max-w-xl mx-auto`}>
              Three steps. Off-chain evaluation. On-chain proof. Bulletproof
              payments.
            </p>
          </motion.div>

          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Set your rules',
                desc: 'Create policy rules: business hours, daily limits, KYC requirements, country restrictions. Register them as a combined rule set on-chain.',
                icon: ShieldCheck,
              },
              {
                step: '02',
                title: 'Send a payment',
                desc: "Enter PayID or wallet address, amount, and asset. PAY.ID fetches the receiver's rules, evaluates them in WASM, and generates an EIP-712 Decision Proof.",
                icon: Zap,
              },
              {
                step: '03',
                title: 'Proof verifies on-chain',
                desc: 'The smart contract validates the Decision Proof. If rules pass → payment executes. If rules fail → payment reverts. No trust required.',
                icon: FileCheck,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                {...fadeUp(i * 0.1)}
                className="flex gap-5 md:gap-8 items-start"
              >
                <div className="hidden md:flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#00D084]/10 flex items-center justify-center text-[#00D084] text-sm font-bold font-mono">
                    {item.step}
                  </div>
                  {i < 2 && <div className="w-px h-16 bg-[#00D084]/15 mt-2" />}
                </div>
                <div
                  className={`flex-1 rounded-2xl p-6 relative overflow-hidden`}
                  style={{
                    background: p.dark
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(0,0,0,0.02)',
                  }}
                >
                  <div
                    className={`absolute inset-0 rounded-2xl border ${p.cardBorder}`}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3 md:hidden">
                      <div className="w-8 h-8 rounded-full bg-[#00D084]/10 flex items-center justify-center text-[#00D084] text-xs font-bold font-mono">
                        {item.step}
                      </div>
                      <h3 className={`text-lg font-semibold ${p.textMain}`}>
                        {item.title}
                      </h3>
                    </div>
                    <h3
                      className={`hidden md:block text-lg font-semibold mb-2 ${p.textMain}`}
                    >
                      {item.title}
                    </h3>
                    <p className={`text-[13px] ${p.textMuted} leading-relaxed`}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6">
        <motion.div
          {...fadeUp(0)}
          className="max-w-3xl mx-auto text-center rounded-3xl p-10 md:p-16 relative overflow-hidden"
          style={{
            background: p.dark
              ? 'linear-gradient(160deg, rgba(0,208,132,0.08) 0%, rgba(11,15,26,0.6) 50%, rgba(11,15,26,0.4) 100%)'
              : 'linear-gradient(160deg, rgba(0,208,132,0.12) 0%, rgba(241,245,249,0.9) 50%, rgba(241,245,249,0.8) 100%)',
          }}
        >
          <div
            className={`absolute inset-0 rounded-3xl border ${p.cardBorder}`}
          />
          <div className="relative">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${p.textMain}`}>
              Ready to pay with policy?
            </h2>
            <p className={`${p.textMuted} mb-8 max-w-md mx-auto`}>
              Launch the app and experience policy-driven payments. Set rules.
              Generate proofs. Pay smarter.
            </p>
            <Link to="/v4/app/dashboard">
              <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#00D084] text-[#0B0F1A] text-sm font-semibold hover:bg-[#00D084]/90 transition-colors shadow-lg shadow-[#00D084]/10 cursor-pointer">
                <Wallet className="w-4 h-4" /> Launch App
              </button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#00D084]/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-sm bg-[#00D084]" />
            </div>
            <span className="text-sm font-semibold">PAY.ID</span>
          </div>
          <p className={`text-[11px] ${p.textMuted}`}>
            Policy & Proof Layer for EVM Chains · Built for Hackathons
          </p>
        </div>
      </footer>
    </div>
  )
}
