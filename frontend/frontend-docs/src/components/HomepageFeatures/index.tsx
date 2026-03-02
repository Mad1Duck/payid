import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import RuleCheckVisual from '../RuleCheckVisual';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
}

interface Step {
  step: string;
  title: string;
  description: string;
}

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */

const FEATURES: Feature[] = [
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

const STEPS: Step[] = [
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

/* ─────────────────────────────────────────────────────────────
   ANIMATION VARIANTS
───────────────────────────────────────────────────────────── */

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
  }),
};

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <section className="px-6 pt-24 pb-32">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
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
              <Button asChild size="lg" className="text-white!">
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

          {/* Right: visual */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={2}
            className="bg-card border border-border rounded-2xl p-6">
            <RuleCheckVisual decision="ALLOW" />
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-6 py-24 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Payment Policy, Not a Payment Rail
            </h2>
            <p className="text-lg text-muted-foreground">
              PAY.ID separates decision from execution, making payment logic auditable, upgradeable,
              and verifiable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={fadeIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="rounded-xl border border-border bg-card p-6">
                <feature.icon className="h-6 w-6 text-primary mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How PAY.ID Works
            </h2>
            <p className="text-lg text-muted-foreground">
              A simple flow designed for safety, composability, and verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.step}
                variants={fadeIn}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                className="rounded-xl border border-border bg-card p-6">
                <div className="font-mono text-sm text-primary mb-2">{step.step}</div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-primary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold dark:text-white text-white! mb-6">
            Start Enforcing Payment Policy
          </h2>
          <p className="text-lg text-primary-foreground/80 mb-8">
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
    </div>
  );
}
