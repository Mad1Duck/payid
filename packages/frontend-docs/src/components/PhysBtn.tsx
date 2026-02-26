import { useState } from 'react';
import { SAGE } from './Playground/old';

export function PhysBtn({ label, onClick, primary, danger, disabled, icon, small, full }) {
  const [pr, setPr] = useState(false);
  const bg = disabled ? '#D0D0D4' : primary ? SAGE : danger ? '#E53935' : '#C8C8CC';
  const sh = disabled ? '#B0B0B4' : primary ? '#3A6030' : danger ? '#B71C1C' : '#A0A0A4';
  const tc = disabled ? '#AAAAAE' : primary || danger ? '#FFF' : '#555';
  return (
    <button
      disabled={disabled}
      onMouseDown={() => !disabled && setPr(true)}
      onMouseUp={() => {
        setPr(false);
        if (!disabled) onClick?.();
      }}
      onMouseLeave={() => setPr(false)}
      style={{
        background: `linear-gradient(180deg,${bg}EE,${bg})`,
        border: 'none',
        borderRadius: small ? '8px' : '10px',
        boxShadow:
          pr || disabled
            ? `inset 0 3px 6px #00000025,0 1px 0 ${sh}`
            : `0 5px 0 ${sh},0 6px 10px #00000020,inset 0 1px 0 rgba(255,255,255,.5)`,
        transform: pr ? 'translateY(4px)' : 'translateY(0)',
        transition: 'all 0.07s',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'Orbitron',monospace",
        fontWeight: 700,
        fontSize: small ? '7px' : '8px',
        letterSpacing: '2px',
        color: tc,
        padding: small ? '0 12px' : '0 18px',
        height: small ? '30px' : '38px',
        width: full ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
      {icon && <span style={{ fontSize: '12px' }}>{icon}</span>}
      {label}
    </button>
  );
}
