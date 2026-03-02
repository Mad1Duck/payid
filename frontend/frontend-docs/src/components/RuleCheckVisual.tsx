import { motion } from 'framer-motion';

const RuleCheckVisual = ({ decision = 'ALLOW' }: { decision?: 'ALLOW' | 'REJECT' }) => {
  const rules = [
    { id: 1, x: 80, y: 60, label: 'tx.amount ≥ 100' },
    { id: 2, x: 80, y: 140, label: 'asset ∈ [USDT]' },
    { id: 3, x: 80, y: 220, label: 'sender allowlist' },
  ];

  const engine = { x: 240, y: 140, label: 'Rule Engine' };
  const decisionNode = { x: 360, y: 140 };

  const decisionColor = decision === 'ALLOW' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

  return (
    <div className="relative w-full max-w-md mx-auto">
      <svg viewBox="0 0 420 280" className="w-full h-auto">
        {/* Rule → Engine lines */}
        {rules.map((r, i) => (
          <motion.path
            key={r.id}
            d={`M ${r.x + 40} ${r.y} Q ${engine.x - 20} ${r.y} ${engine.x - 40} ${engine.y}`}
            stroke="hsl(var(--border))"
            strokeWidth="2"
            strokeDasharray="6 4"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, delay: i * 0.2 }}
          />
        ))}

        {/* Flow dots */}
        {rules.map((r, i) => (
          <motion.circle
            key={`dot-${i}`}
            r="4"
            fill="hsl(var(--primary))"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 2,
              delay: 1 + i * 0.3,
              repeat: Infinity,
              repeatDelay: 2,
            }}>
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin={`${1 + i * 0.3}s`}
              path={`M ${r.x + 40} ${r.y} Q ${engine.x - 20} ${r.y} ${engine.x - 40} ${engine.y}`}
            />
          </motion.circle>
        ))}

        {/* Rule nodes */}
        {rules.map((r, i) => (
          <motion.g
            key={r.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: i * 0.15 }}>
            <rect
              x={r.x - 40}
              y={r.y - 20}
              width="120"
              height="40"
              rx="8"
              fill="hsl(var(--card))"
              stroke="hsl(var(--border))"
              strokeWidth="1.5"
            />
            <text
              x={r.x + 20}
              y={r.y + 5}
              textAnchor="middle"
              fontSize="12"
              fill="hsl(var(--muted-foreground))">
              {r.label}
            </text>
          </motion.g>
        ))}

        {/* Rule Engine */}
        <motion.g
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}>
          <rect
            x={engine.x - 60}
            y={engine.y - 35}
            width="120"
            height="70"
            rx="12"
            fill="hsl(var(--secondary))"
            stroke="hsl(var(--border))"
            strokeWidth="1.5"
          />
          <text x={engine.x} y={engine.y + 5} textAnchor="middle" fontSize="13" fontWeight="600">
            Rule Engine
          </text>
        </motion.g>

        {/* Engine → Decision */}
        <motion.path
          d={`M ${engine.x + 60} ${engine.y} L ${decisionNode.x - 40} ${decisionNode.y}`}
          stroke="hsl(var(--border))"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        />

        {/* Decision Node */}
        <motion.g
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}>
          <rect
            x={decisionNode.x - 50}
            y={decisionNode.y - 25}
            width="100"
            height="50"
            rx="10"
            fill={decisionColor}
          />
          <text
            x={decisionNode.x}
            y={decisionNode.y + 6}
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="white">
            {decision}
          </text>
        </motion.g>
      </svg>
    </div>
  );
};

export default RuleCheckVisual;
