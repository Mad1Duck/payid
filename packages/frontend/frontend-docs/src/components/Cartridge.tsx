import { useState } from 'react';
import { PinBlock } from './PinBlock';
import { RuleIcon } from './RuleIcon';

export function Cartridge({
  rule,
  mini = false,
  dragging = false,
  plugged = false,
  onDragStart,
  onDragEnd,
}) {
  const [hov, setHov] = useState(false);
  const h = mini ? '36px' : '44px';
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: h,
        background: hov && !dragging ? `${rule.bg}40` : `${rule.bg}25`,
        border: `1.5px solid ${rule.color}${hov ? 'CC' : '55'}`,
        borderRadius: '7px',
        padding: '0 8px 0 0',
        cursor: dragging ? 'grabbing' : 'grab',
        opacity: dragging ? 0.3 : 1,
        transform: hov && !dragging ? 'translateY(-2px) scale(1.01)' : 'scale(1)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        userSelect: 'none',
        boxShadow:
          hov && !dragging
            ? `0 6px 18px ${rule.color}44,inset 0 1px 0 rgba(255,255,255,.6)`
            : `0 2px 6px ${rule.color}22,inset 0 1px 0 rgba(255,255,255,.5)`,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          background: 'linear-gradient(180deg,rgba(255,255,255,.45),transparent)',
          borderRadius: '6px 6px 0 0',
          pointerEvents: 'none',
        }}
      />
      <div style={{ marginLeft: '4px', marginRight: '8px', flexShrink: 0 }}>
        <PinBlock color={rule.color} lit={plugged} small={mini} />
      </div>
      <div
        style={{
          width: mini ? '28px' : '34px',
          height: mini ? '28px' : '34px',
          background: `${rule.bg}60`,
          borderRadius: '6px',
          border: `1px solid ${rule.color}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
        <RuleIcon icon={rule.icon} size={mini ? 14 : 18} />
      </div>
      <div style={{ flex: 1, minWidth: 0, marginLeft: '8px' }}>
        <div
          style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: mini ? '8px' : '9px',
            fontWeight: 700,
            color: rule.color,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          {rule.label}
        </div>
        {!mini && (
          <div
            style={{
              fontFamily: "'Space Mono',monospace",
              fontSize: '7px',
              color: '#999',
              marginTop: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {rule.desc}
          </div>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Space Mono',monospace",
          fontWeight: 700,
          fontSize: '7px',
          letterSpacing: '1px',
          color: rule.color,
          border: `1.5px solid ${rule.color}`,
          background: `${rule.bg}50`,
          padding: '2px 6px',
          borderRadius: '4px',
          marginLeft: '6px',
          flexShrink: 0,
        }}>
        {rule.chip}
      </div>
    </div>
  );
}
