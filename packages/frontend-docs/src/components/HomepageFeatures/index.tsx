import { motion } from 'framer-motion';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import RuleCheckVisual from '../RuleCheckVisual';

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* ================= HERO ================= */}
      <section className="relative px-6 pt-24 pb-32 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
              Programmable Payment Policy.
              <br />
              <span className="text-primary">Verified Before Execution.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl">
              PAY.ID lets you define payment rules off-chain, evaluate them deterministically, and
              enforce the decision on-chain or in backend systems.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <Link to="/docs/01-overview">
                  Read the Docs
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button variant="outline" size="lg" asChild>
                <Link to="/playground">Try Playground</Link>
              </Button>
            </div>
          </motion.div>

          {/* Right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative bg-card border border-border rounded-2xl p-6">
            <RuleCheckVisual decision="ALLOW" />
          </motion.div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="px-6 py-24 bg-muted/30">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Payment Policy, Not a Payment Rail
          </h2>
          <label className="text-lg text-muted-foreground max-w-2xl mx-auto">
            PAY.ID separates decision from execution, making payment logic auditable, upgradeable,
            and verifiable.
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6">
              <f.icon className="h-6 w-6 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="px-6 py-24 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">How PAY.ID Works</h2>
          <p className="text-lg text-muted-foreground mx-auto text-center w-full">
            A simple flow designed for safety, composability, and verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6">
              <div className="text-primary font-mono text-sm mb-2">{s.step}</div>
              <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="px-6 py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Start Enforcing Payment Policy</h2>
          <p className="text-lg opacity-90 mb-8">
            Open-source, protocol-first, and built for developers.
          </p>

          <Button size="lg" variant="secondary" asChild>
            <Link to="/docs/01-overview">
              Get Started with PAY.ID
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      {/* <footer className="px-6 py-12 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-4">
          <div>
            <div className="font-semibold text-foreground">PAY.ID</div>
            <div className="text-sm text-muted-foreground">Verifiable Payment Policy Protocol</div>
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/docs/01-overview">Docs</Link>
            <Link to="/docs/15-hackathon-sponsor">Hackathon</Link>
            <a href="https://github.com/your-repo" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </div>
      </footer> */}
    </div>
  );
}

/* ================= DATA ================= */

const FEATURES = [
  {
    icon: Shield,
    title: 'Fail-Closed by Default',
    description:
      'Any rule failure, invalid input, or engine error results in a deterministic REJECT.',
  },
  {
    icon: Zap,
    title: 'Off-chain Rules, On-chain Truth',
    description: 'Rules are evaluated off-chain and enforced using cryptographic decision proofs.',
  },
  {
    icon: Globe,
    title: 'ERC-4337 & Backend Ready',
    description: 'Works seamlessly with smart accounts, DAOs, and traditional backend systems.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Build Context',
    description: 'Construct a payment context containing sender, asset, amount, and chain.',
  },
  {
    step: '02',
    title: 'Evaluate Rules',
    description: 'Rules are evaluated off-chain inside a deterministic WASM engine.',
  },
  {
    step: '03',
    title: 'Verify Decision',
    description: 'The signed decision is verified before any transaction is executed.',
  },
];
